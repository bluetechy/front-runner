import { describe, expect, it, jest } from "@jest/globals";
import { BadRequestException } from "@nestjs/common";
import type {
  IdentityAdminService,
  Principal,
} from "../authentication/index.js";
import type { SecurityEventsService } from "../security-events/index.js";
import { PasswordChangeService } from "./password-change.service.js";

/*
 * Changing a password from inside the account.
 *
 * Four assertions carry this file, and they are the four steps in order.
 * Nothing is set until the current password has been proved, because a session
 * says who the account is and not who is at the keyboard. The change is
 * recorded before the sessions are ended, because a provider that will not
 * list sessions must not cost the account the record of its own password
 * changing. Every other session goes and this one stays. And nothing after the
 * password is set may report the change as one that did not happen.
 */

const account = {
  subjectId: "subject-member",
  username: "marcus",
  email: "marcus@example.test",
  firstName: "Marcus",
};

const principal: Principal = {
  userId: "b0000000-0000-4000-8000-000000000003",
  loginName: "marcus",
  sessionId: "session-now",
  device: "Mac OS",
};

const CURRENT = "letmein";
const NEXT = "Trombone-42-Fig";

function setup() {
  const identity = {
    findAccount: jest.fn<(identifier: string) => Promise<unknown>>(),
    verifyPassword:
      jest.fn<(loginName: string, password: string) => Promise<boolean>>(),
    setPassword: jest.fn<(id: string, password: string) => Promise<void>>(),
    passwordChangedAt: jest.fn<(id: string) => Promise<Date | null>>(),
    endOtherSessions:
      jest.fn<(id: string, keep: string | null) => Promise<number>>(),
  };
  identity.findAccount.mockResolvedValue(account);
  identity.verifyPassword.mockResolvedValue(true);
  identity.setPassword.mockResolvedValue(undefined);
  identity.passwordChangedAt.mockResolvedValue(
    new Date("2026-09-24T10:00:00Z"),
  );
  identity.endOtherSessions.mockResolvedValue(2);

  const events = {
    record:
      jest.fn<
        (
          loginName: string,
          eventType: string,
          description: string,
          device?: string,
        ) => Promise<void>
      >(),
  };
  events.record.mockResolvedValue(undefined);

  return {
    identity,
    events,
    service: new PasswordChangeService(
      identity as unknown as IdentityAdminService,
      events as unknown as SecurityEventsService,
    ),
  };
}

describe("when the password was last set", () => {
  it("asks the identity provider about the session's own account", async () => {
    const { service, identity } = setup();

    await expect(service.status(principal)).resolves.toEqual({
      ChangedAt: new Date("2026-09-24T10:00:00Z"),
    });
    expect(identity.findAccount).toHaveBeenCalledWith("marcus");
    expect(identity.passwordChangedAt).toHaveBeenCalledWith("subject-member");
  });

  /* A line on a card, so a provider that will not answer costs the line and
   * not the page. */
  it("answers with no date rather than failing when nothing is known", async () => {
    const { service, identity } = setup();
    identity.passwordChangedAt.mockResolvedValue(null);

    await expect(service.status(principal)).resolves.toEqual({
      ChangedAt: null,
    });
  });
});

describe("proving it is them", () => {
  it("sets nothing until the current password has been proved", async () => {
    const { service, identity, events } = setup();
    identity.verifyPassword.mockResolvedValue(false);

    await expect(
      service.change(principal, "not-it", NEXT),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(identity.setPassword).not.toHaveBeenCalled();
    expect(events.record).not.toHaveBeenCalled();
    expect(identity.endOtherSessions).not.toHaveBeenCalled();
  });

  it("checks it against the provider, by the name the account logs in with", async () => {
    const { service, identity } = setup();

    await service.change(principal, CURRENT, NEXT);

    expect(identity.verifyPassword).toHaveBeenCalledWith("marcus", CURRENT);
  });

  /* Worked out here rather than sent to the provider to be refused, which
   * would put a right password through the check and then turn it down. */
  it("refuses a new password that is the old one, before asking anybody", async () => {
    const { service, identity } = setup();

    await expect(service.change(principal, CURRENT, CURRENT)).rejects.toThrow(
      "different from the one you use now",
    );

    expect(identity.verifyPassword).not.toHaveBeenCalled();
    expect(identity.setPassword).not.toHaveBeenCalled();
  });

  it("refuses when the session's account is no longer at the provider", async () => {
    const { service, identity } = setup();
    identity.findAccount.mockResolvedValue(null);

    await expect(service.change(principal, CURRENT, NEXT)).rejects.toThrow(
      "no longer here",
    );
    expect(identity.setPassword).not.toHaveBeenCalled();
  });
});

describe("what happens once it is proved", () => {
  it("sets the new password on the account the provider named", async () => {
    const { service, identity } = setup();

    await service.change(principal, CURRENT, NEXT);

    expect(identity.setPassword).toHaveBeenCalledWith("subject-member", NEXT);
  });

  it("writes it to the security log, naming the device it happened on", async () => {
    const { service, events } = setup();

    await service.change(principal, CURRENT, NEXT);

    expect(events.record).toHaveBeenCalledWith(
      "marcus",
      "PasswordChanged",
      "Your password was changed on Mac OS.",
      "Mac OS",
    );
  });

  it("says it without a device where the request did not know one", async () => {
    const { service, events } = setup();

    await service.change({ ...principal, device: null }, CURRENT, NEXT);

    expect(events.record).toHaveBeenCalledWith(
      "marcus",
      "PasswordChanged",
      "Your password was changed.",
      undefined,
    );
  });

  /* The assertion behind the order in the service: a provider that will not
   * list sessions must not cost the account the record of its own password
   * changing. */
  it("records the change before it goes near the sessions", async () => {
    const { service, identity, events } = setup();
    const order: string[] = [];
    events.record.mockImplementation(async () => {
      order.push("recorded");
    });
    identity.endOtherSessions.mockImplementation(async () => {
      order.push("sessions");
      return 2;
    });

    await service.change(principal, CURRENT, NEXT);

    expect(order).toEqual(["recorded", "sessions"]);
  });

  it("ends every session but the one the request came in on", async () => {
    const { service, identity } = setup();

    await expect(service.change(principal, CURRENT, NEXT)).resolves.toEqual({
      ChangedAt: new Date("2026-09-24T10:00:00Z"),
      OtherSessionsEnded: 2,
    });
    expect(identity.endOtherSessions).toHaveBeenCalledWith(
      "subject-member",
      "session-now",
    );
  });
});

describe("after the password has already changed", () => {
  /* Nothing past setPassword may throw. Somebody whose password is now
   * different from the one they arrived with must not be told it failed, and
   * would then have two passwords to try. */
  it("still answers when the sessions could not be ended", async () => {
    const { service, identity } = setup();
    identity.endOtherSessions.mockRejectedValue(new Error("provider is down"));

    await expect(service.change(principal, CURRENT, NEXT)).resolves.toEqual({
      ChangedAt: new Date("2026-09-24T10:00:00Z"),
      // Null and not zero: "we could not say" is not "there were none", and
      // the card says different things about the two.
      OtherSessionsEnded: null,
    });
  });

  it("still answers when the new stamp could not be read back", async () => {
    const { service, identity } = setup();
    identity.passwordChangedAt.mockRejectedValue(new Error("provider is down"));

    await expect(service.change(principal, CURRENT, NEXT)).resolves.toEqual({
      ChangedAt: null,
      OtherSessionsEnded: 2,
    });
  });
});
