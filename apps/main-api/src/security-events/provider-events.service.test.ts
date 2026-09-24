import { describe, expect, it, jest } from "@jest/globals";
import type { ConfigService } from "@nestjs/config";
import { IdentityAdminService } from "../authentication/index.js";
import {
  ProviderEventsService,
  endedDescription,
  failureDescription,
} from "./provider-events.service.js";
import { SecurityEventsService } from "./security-events.service.js";

/*
 * The one timer in this API, and the two things on the security page this
 * application does not cause.
 *
 * What is worth pinning here is not that it copies rows. It is the rules that
 * keep the copy honest, and they are different for the two halves:
 *
 *   * a refused login is not deduplicated, so the high-water mark only ever moves
 *     over a row that was really written, and the off switch really stops it;
 *   * a finished session is deduplicated on the session, so there is no mark at
 *     all, and the order things are written in is what decides which sentence a
 *     reader sees.
 */

const SUBJECT = "subject-member";
const SESSION = "session-one";

/* Frozen, so that a Date built in a test and the same Date rebuilt in its
 * assertion are the same millisecond. */
const NOW = Date.now();

function at(minutesAgo: number): Date {
  return new Date(NOW - minutesAgo * 60_000);
}

function failure(minutesAgo: number, reason: string | null = null) {
  return { subjectId: SUBJECT, at: at(minutesAgo), reason };
}

function ended(minutesAgo: number, deliberate = true, sessionId = SESSION) {
  return { sessionId, at: at(minutesAgo), deliberate };
}

/* The moments this sweep actually wrote, in the order it wrote them. */
function written(
  record: jest.Mock<SecurityEventsService["recordLoginFailure"]>,
): number[] {
  return record.mock.calls.map((call) => call[2].getTime());
}

/* The sentence and the session of each logout written, in order. */
function logouts(
  record: jest.Mock<SecurityEventsService["recordLogout"]>,
): [string, string][] {
  return record.mock.calls.map((call) => [call[0], call[1]]);
}

function setup({
  enabled = true,
  failures = [] as ReturnType<typeof failure>[],
  sessions = [] as ReturnType<typeof ended>[],
  newest = null as Date | null,
} = {}) {
  const loginFailures = jest
    .fn<IdentityAdminService["loginFailures"]>()
    .mockResolvedValue(failures);
  const endedSessions = jest
    .fn<IdentityAdminService["endedSessions"]>()
    .mockResolvedValue(sessions);
  const recordLoginFailure = jest
    .fn<SecurityEventsService["recordLoginFailure"]>()
    .mockResolvedValue(undefined);
  const recordLogout = jest
    .fn<SecurityEventsService["recordLogout"]>()
    .mockResolvedValue(undefined);
  const newestLoginFailure = jest
    .fn<SecurityEventsService["newestLoginFailure"]>()
    .mockResolvedValue(newest);

  const service = new ProviderEventsService(
    { get: () => enabled } as unknown as ConfigService,
    { loginFailures, endedSessions } as unknown as IdentityAdminService,
    {
      recordLoginFailure,
      recordLogout,
      newestLoginFailure,
    } as unknown as SecurityEventsService,
  );

  return {
    service,
    loginFailures,
    endedSessions,
    recordLoginFailure,
    recordLogout,
    newestLoginFailure,
  };
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
    expect(order).toEqual(order.toSorted((a, b) => a - b));
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

describe("mirroring finished sessions onto the security page", () => {
  it("records a session the provider says somebody logged out of", async () => {
    const { service, recordLogout } = setup({ sessions: [ended(5)] });

    await service.sweep();

    expect(recordLogout).toHaveBeenCalledWith(
      SESSION,
      "You logged out.",
      undefined,
      at(5),
    );
  });

  /* A session that ended with nobody deciding to end it: idle, past its maximum
   * lifespan, or revoked. The provider cannot tell those apart, so neither can
   * this, and the sentence claims only what is certain. */
  it("says less about a session that ended without a logout", async () => {
    const { service, recordLogout } = setup({
      sessions: [ended(5, false)],
    });

    await service.sweep();

    expect(recordLogout.mock.calls[0]?.[1]).toBe(
      "This session ended without a logout.",
    );
  });

  /* The provider's stamp again, and it matters more here than on a failure: a
   * logout stamped now would sort above the login it ends. */
  it("keeps the moment the session ended", async () => {
    const { service, recordLogout } = setup({ sessions: [ended(40)] });

    await service.sweep();

    expect(recordLogout.mock.calls[0]?.[3]).toEqual(at(40));
  });

  /* The provider's event log carries no user agent, so only the browser's own
   * report of a logout knows a device. Guessing is worse than the missing line. */
  it("claims no device for a session it only heard about", async () => {
    const { service, recordLogout } = setup({ sessions: [ended(5)] });

    await service.sweep();

    expect(recordLogout.mock.calls[0]?.[2]).toBeUndefined();
  });

  /* **The ordering rule.** Our own logout produces a LOGOUT and then, from any
   * other tab still holding a token, a refused refresh moments later. Both name
   * the same session, the database keeps the first sentence, so writing in the
   * order things happened is what makes the page say "You logged out." */
  it("writes a logout before the refused refresh that follows it", async () => {
    const { service, recordLogout } = setup({
      sessions: [ended(4, false), ended(5, true)],
    });

    await service.sweep();

    expect(logouts(recordLogout)).toEqual([
      [SESSION, "You logged out."],
      [SESSION, "This session ended without a logout."],
    ]);
  });

  /* No high-water mark here, because the write is idempotent on the session. The
   * set is only to keep a session that lingers in the provider's log from being
   * re-offered every minute for as long as it is there. */
  it("does not offer the same session again on the next sweep", async () => {
    const { service, recordLogout } = setup({ sessions: [ended(5)] });

    await service.sweep();
    await service.sweep();

    expect(recordLogout).toHaveBeenCalledTimes(1);
  });

  it("records a different session on a later sweep", async () => {
    const { service, endedSessions, recordLogout } = setup({
      sessions: [ended(5)],
    });

    await service.sweep();
    endedSessions.mockResolvedValue([ended(1, true, "session-two")]);
    await service.sweep();

    expect(recordLogout).toHaveBeenCalledTimes(2);
    expect(recordLogout.mock.calls[1]?.[0]).toBe("session-two");
  });

  /* **The switch is about failures and not about this.** A session costs the page
   * one login row and one logout row and never a third, so there is nothing here
   * for a switch to protect anybody from. */
  it("still records finished sessions when failed logins are switched off", async () => {
    const { service, loginFailures, recordLoginFailure, recordLogout } = setup({
      enabled: false,
      failures: [failure(5)],
      sessions: [ended(5)],
    });

    await service.sweep();

    expect(loginFailures).not.toHaveBeenCalled();
    expect(recordLoginFailure).not.toHaveBeenCalled();
    expect(recordLogout).toHaveBeenCalledTimes(1);
  });
});

describe("when the write or the provider fails", () => {
  /* The rule that makes the failure half safe to retry: the mark follows the
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

  /* The two halves are swept separately, so one provider call failing does not
   * cost the other its turn. */
  it("still mirrors finished sessions when the failure read throws", async () => {
    const { service, loginFailures, recordLogout } = setup({
      sessions: [ended(5)],
    });
    loginFailures.mockRejectedValue(new Error("403"));
    jest.spyOn(service["logger"], "warn").mockImplementation(() => {});

    await service.sweep();

    expect(recordLogout).toHaveBeenCalledTimes(1);
  });

  it("still mirrors refused logins when the session read throws", async () => {
    const { service, endedSessions, recordLoginFailure } = setup({
      failures: [failure(5)],
    });
    endedSessions.mockRejectedValue(new Error("403"));
    jest.spyOn(service["logger"], "warn").mockImplementation(() => {});

    await service.sweep();

    expect(recordLoginFailure).toHaveBeenCalledTimes(1);
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

describe("the timer and the off switch", () => {
  it("runs on a timer, and lets the process exit", () => {
    const { service } = setup();

    service.onModuleInit();

    expect(service["timer"]).not.toBeNull();

    service.onModuleDestroy();
    expect(service["timer"]).toBeNull();
  });

  /* The switch turns off one of the two things this mirrors, so the timer keeps
   * running: finished sessions are not the noisy half. */
  it("keeps the timer when failed logins are switched off", () => {
    const { service } = setup({ enabled: false });

    service.onModuleInit();

    expect(service["timer"]).not.toBeNull();
    service.onModuleDestroy();
  });

  it("writes no failures even if something calls a sweep anyway", async () => {
    const { service, loginFailures, recordLoginFailure } = setup({
      enabled: false,
      failures: [failure(5)],
    });

    await service.sweep();

    expect(loginFailures).not.toHaveBeenCalled();
    expect(recordLoginFailure).not.toHaveBeenCalled();
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

describe("what a finished session says on the page", () => {
  it("says somebody logged out where the provider recorded one", () => {
    expect(endedDescription(true)).toBe("You logged out.");
  });

  /* It does not say "your session expired", because the provider cannot tell an
   * idle session from a revoked one and neither can this. */
  it("claims only what is certain about the rest", () => {
    expect(endedDescription(false)).toBe(
      "This session ended without a logout.",
    );
  });
});
