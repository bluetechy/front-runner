import { describe, expect, it, jest } from "@jest/globals";
import type { ConfigService } from "@nestjs/config";
import { IdentityAdminService } from "../authentication/index.js";
import {
  LoginFailuresService,
  failureDescription,
} from "./login-failures.service.js";
import { SecurityEventsService } from "./security-events.service.js";

/*
 * The one timer in this API, and the one thing on the security page this
 * application does not cause.
 *
 * What is worth pinning here is not that it copies rows. It is the two rules
 * that keep the copy honest: the high-water mark only ever moves over a row that
 * was really written, and the off switch really stops it.
 */

const SUBJECT = "subject-member";

/* Frozen, so that a Date built in a test and the same Date rebuilt in its
 * assertion are the same millisecond. */
const NOW = Date.now();

function at(minutesAgo: number): Date {
  return new Date(NOW - minutesAgo * 60_000);
}

function failure(minutesAgo: number, reason: string | null = null) {
  return { subjectId: SUBJECT, at: at(minutesAgo), reason };
}

/* The moments this sweep actually wrote, in the order it wrote them. */
function written(
  record: jest.Mock<SecurityEventsService["recordLoginFailure"]>,
): number[] {
  return record.mock.calls.map((call) => call[2].getTime());
}

function setup({
  enabled = true,
  failures = [] as ReturnType<typeof failure>[],
  newest = null as Date | null,
} = {}) {
  const loginFailures = jest
    .fn<IdentityAdminService["loginFailures"]>()
    .mockResolvedValue(failures);
  const recordLoginFailure = jest
    .fn<SecurityEventsService["recordLoginFailure"]>()
    .mockResolvedValue(undefined);
  const newestLoginFailure = jest
    .fn<SecurityEventsService["newestLoginFailure"]>()
    .mockResolvedValue(newest);

  const service = new LoginFailuresService(
    { get: () => enabled } as unknown as ConfigService,
    { loginFailures } as unknown as IdentityAdminService,
    {
      recordLoginFailure,
      newestLoginFailure,
    } as unknown as SecurityEventsService,
  );

  return { service, loginFailures, recordLoginFailure, newestLoginFailure };
}

describe("mirroring refused logins onto the security page", () => {
  it("records what the provider says it refused", async () => {
    const { service, recordLoginFailure } = setup({
      failures: [failure(5, "invalid_user_credentials")],
    });

    await service.sweep();

    expect(recordLoginFailure).toHaveBeenCalledWith(
      SUBJECT,
      "Someone tried to log in with the wrong password.",
      expect.any(Date),
    );
  });

  /* The provider's stamp, not this sweep's clock: the attempt happened when the
   * password was refused, which is up to an interval earlier. */
  it("keeps the moment the provider refused it", async () => {
    const refused = at(3);
    const { service, recordLoginFailure } = setup({
      failures: [{ subjectId: SUBJECT, at: refused, reason: null }],
    });

    await service.sweep();

    expect(recordLoginFailure.mock.calls[0]?.[2]).toBe(refused);
  });

  /* The provider answers newest first and that is the wrong order to write in:
   * a sweep that died halfway would leave the mark past rows it never wrote. */
  it("writes oldest first, whatever order the provider answered in", async () => {
    const { service, recordLoginFailure } = setup({
      failures: [failure(1), failure(9), failure(5)],
    });

    await service.sweep();

    const order = written(recordLoginFailure);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("asks the database where it left off rather than starting from now", async () => {
    const { service, newestLoginFailure } = setup({ newest: at(30) });

    await service.sweep();

    expect(newestLoginFailure).toHaveBeenCalled();
  });

  /* A restart must not write somebody's log twice. Everything at or before the
   * newest row already on record is already on the page. */
  it("skips what is already on record", async () => {
    const { service, recordLoginFailure } = setup({
      newest: at(10),
      failures: [failure(20), failure(15), failure(5)],
    });

    await service.sweep();

    expect(recordLoginFailure).toHaveBeenCalledTimes(1);
    expect(written(recordLoginFailure)).toEqual([at(5).getTime()]);
  });

  /* The mark is asked for once. A sweep every minute that read it back out of
   * the database each time would be a query a minute for an answer it holds. */
  it("only asks the database where it left off once", async () => {
    const { service, newestLoginFailure } = setup({
      failures: [failure(5)],
    });

    await service.sweep();
    await service.sweep();

    expect(newestLoginFailure).toHaveBeenCalledTimes(1);
  });

  it("does not record the same failure on the next sweep", async () => {
    const { service, recordLoginFailure } = setup({
      failures: [failure(5)],
    });

    await service.sweep();
    await service.sweep();

    expect(recordLoginFailure).toHaveBeenCalledTimes(1);
  });

  /* Nothing on record and nothing to go on: a page filling with a year of the
   * provider's history the moment this shipped would be worse than one that
   * starts today. */
  it("reaches back a day at most when there is nothing to resume from", async () => {
    const { service, recordLoginFailure } = setup({
      newest: null,
      failures: [failure(60 * 24 + 60), failure(60)],
    });

    await service.sweep();

    expect(recordLoginFailure).toHaveBeenCalledTimes(1);
    expect(written(recordLoginFailure)).toEqual([at(60).getTime()]);
  });
});

describe("when the write or the provider fails", () => {
  /* The rule that makes the whole thing safe to retry: the mark follows the
   * rows that were written, not the rows that were read. */
  it("leaves the mark on the last failure it actually wrote", async () => {
    const { service, recordLoginFailure } = setup({
      failures: [failure(9), failure(5), failure(1)],
    });
    recordLoginFailure
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("the database went away"));

    await service.sweep();
    expect(recordLoginFailure).toHaveBeenCalledTimes(2);

    // The next sweep sees the same three and retries the two it did not write.
    recordLoginFailure.mockResolvedValue(undefined);
    await service.sweep();

    expect(written(recordLoginFailure).slice(2)).toEqual([
      at(5).getTime(),
      at(1).getTime(),
    ]);
  });

  /* A provider that cannot be reached is a warning, never a crash: this is
   * bookkeeping on a timer and nothing is waiting on it. */
  it("says so and carries on when the provider will not answer", async () => {
    const { service, loginFailures } = setup();
    loginFailures.mockRejectedValue(new Error("403"));
    const warn = jest
      .spyOn(service["logger"], "warn")
      .mockImplementation(() => {});

    await expect(service.sweep()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  /* A realm that was never configured to keep these events fails forever. One
   * warning a minute for the life of the process is how a log stops being read
   * at all. */
  it("does not repeat the warning every minute", async () => {
    const { service, loginFailures } = setup();
    loginFailures.mockRejectedValue(new Error("403"));
    const warn = jest
      .spyOn(service["logger"], "warn")
      .mockImplementation(() => {});

    await service.sweep();
    await service.sweep();
    await service.sweep();

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("says so again once it has worked in between", async () => {
    const { service, loginFailures } = setup();
    const warn = jest
      .spyOn(service["logger"], "warn")
      .mockImplementation(() => {});

    loginFailures.mockRejectedValueOnce(new Error("503"));
    await service.sweep();
    loginFailures.mockResolvedValueOnce([]);
    await service.sweep();
    loginFailures.mockRejectedValueOnce(new Error("503"));
    await service.sweep();

    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe("the off switch", () => {
  /* The one event type with one, because it is the one nothing deduplicates:
   * ten attempts are ten rows, and a realm being scanned can fill a page. */
  it("starts no timer when it is off", () => {
    const { service } = setup({ enabled: false });

    service.onModuleInit();

    expect(service["timer"]).toBeNull();
    service.onModuleDestroy();
  });

  it("writes nothing even if something calls a sweep anyway", async () => {
    const { service, loginFailures, recordLoginFailure } = setup({
      enabled: false,
      failures: [failure(5)],
    });

    await service.sweep();

    expect(loginFailures).not.toHaveBeenCalled();
    expect(recordLoginFailure).not.toHaveBeenCalled();
  });

  it("runs on a timer when it is on, and lets the process exit", () => {
    const { service } = setup();

    service.onModuleInit();

    expect(service["timer"]).not.toBeNull();

    service.onModuleDestroy();
    expect(service["timer"]).toBeNull();
  });
});

describe("what a failed login says on the page", () => {
  /* The reasons a reader would act on differently. Everything else collapses,
   * because "a login attempt failed for reason expired_code" is not English. */
  it.each([
    ["invalid_user_credentials", /wrong password/],
    ["user_temporarily_disabled", /blocked/],
    ["user_disabled", /turned off/],
  ])("turns %s into a sentence", (reason, shape) => {
    expect(failureDescription(reason)).toMatch(shape);
  });

  it.each([null, "expired_code", "something_new_in_keycloak_30"])(
    "falls back to one honest sentence for %s",
    (reason) => {
      expect(failureDescription(reason)).toBe("A login attempt failed.");
    },
  );
});
