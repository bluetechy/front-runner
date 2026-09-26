import { describe, expect, it, jest } from "@jest/globals";
import type {
  Account,
  IdentityAdminService,
  Principal,
  SecondFactor,
} from "../authentication/index.js";
import type { DatabaseService } from "../database/index.js";
import type { SecurityEventsService } from "../security-events/index.js";
import { TwoFactorService } from "./two-factor.service.js";

/*
 * Two-factor authentication, and the way back in when it is lost.
 *
 * Four things here are worth more than the rest.
 *
 * **What a returning browser is believed about.** `confirm` is handed a kind
 * off a URL. It is not written down: it names something to go and ask the
 * provider about, the provider is asked, and the security log is written only
 * if the answer is yes. The same argument SingleSignOnService.confirm rests on.
 *
 * **A recovery code does not log anybody in.** It takes the factors off the
 * account and answers what it did, and the ordinary password login is what
 * happens next. Nothing here mints, returns or implies a session.
 *
 * **Every failure of that one is the same sentence.** A wrong password, a
 * wrong code, an account that is not here and an account with no codes are
 * answered identically, because the form is reachable without a session.
 *
 * **Every subject id comes from the session**, except in the public operation,
 * where it comes from the provider's answer about a name plus a password that
 * was checked. Nothing takes an account off a request and acts on it.
 */

const principal: Principal = {
  userId: "b0000000-0000-4000-8000-000000000003",
  loginName: "marcus",
  sessionId: "session-now",
  device: "Mac OS",
};

const account: Account = {
  subjectId: "subject-marcus",
  username: "marcus",
  email: "marcus@example.test",
  firstName: "Marcus",
};

const app: SecondFactor = {
  kind: "authenticator-app",
  id: "credential-otp",
  label: "iPhone",
  createdAt: new Date("2026-09-01T10:00:00.000Z"),
};

function setup(factors: SecondFactor[] = [], rows: unknown[] = []) {
  const db = {
    query: jest.fn<(sql: string, values: unknown[]) => Promise<unknown[]>>(),
  };
  db.query.mockResolvedValue(rows);

  const identity = {
    findAccount: jest.fn<(name: string) => Promise<Account | null>>(),
    verifyPassword:
      jest.fn<(name: string, password: string) => Promise<boolean>>(),
    secondFactors: jest.fn<(subject: string) => Promise<SecondFactor[]>>(),
    removeSecondFactor:
      jest.fn<(subject: string, id: string) => Promise<void>>(),
  };
  identity.findAccount.mockResolvedValue(account);
  identity.verifyPassword.mockResolvedValue(true);
  identity.secondFactors.mockResolvedValue(factors);
  identity.removeSecondFactor.mockResolvedValue(undefined);

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
    db,
    identity,
    events,
    service: new TwoFactorService(
      db as unknown as DatabaseService,
      identity as unknown as IdentityAdminService,
      events as unknown as SecurityEventsService,
    ),
  };
}

describe("what the card is drawn from", () => {
  it("is every kind this product offers, configured or not", async () => {
    const { service } = setup();

    const methods = await service.methods(principal);

    expect(methods.map((method) => method.Kind)).toEqual([
      "authenticator-app",
      "sms",
    ]);
  });

  it("marks the one this account has, and says when and what it is called", async () => {
    const { service } = setup([app]);

    const [authenticator] = await service.methods(principal);

    expect(authenticator).toMatchObject({
      Configured: true,
      ConfiguredAt: app.createdAt,
      Label: "iPhone",
    });
  });

  /* A row this installation cannot use is still a row. Dropping it would hide
   * the reason it is missing from the one page whose job is saying what
   * protects an account. */
  it("keeps the SMS row, says it is not available, and says it is the weaker one", async () => {
    const { service } = setup([app]);

    const [, sms] = await service.methods(principal);

    expect(sms).toMatchObject({
      Kind: "sms",
      Available: false,
      Configured: false,
      Recommended: false,
    });
  });

  it("recommends the authenticator app", async () => {
    const { service } = setup();

    const [authenticator] = await service.methods(principal);

    expect(authenticator).toMatchObject({ Recommended: true });
  });

  // Never off the request: an operation that let a caller name the account
  // would be a way to read anybody's.
  it("asks the provider about the account the session names", async () => {
    const { identity, service } = setup();

    await service.methods(principal);

    expect(identity.findAccount).toHaveBeenCalledWith("marcus");
    expect(identity.secondFactors).toHaveBeenCalledWith("subject-marcus");
  });
});

describe("coming back from the provider's setup page", () => {
  it("records it once the provider says the factor is really there", async () => {
    const { events, service } = setup([app]);

    await service.confirm(principal, "authenticator-app");

    expect(events.record).toHaveBeenCalledWith(
      "marcus",
      "TwoFactorEnabled",
      expect.stringContaining("Authenticator app"),
      "Mac OS",
    );
  });

  // The claim on the URL is a hint, never a fact. A trip somebody abandoned
  // halfway comes back looking exactly like a finished one.
  it("records nothing when the provider holds no such factor", async () => {
    const { events, service } = setup([]);

    const methods = await service.confirm(principal, "authenticator-app");

    expect(events.record).not.toHaveBeenCalled();
    expect(methods[0]).toMatchObject({ Configured: false });
  });

  it("answers the whole list, so the card redraws from what is true", async () => {
    const { service } = setup([app]);

    const methods = await service.confirm(principal, "authenticator-app");

    expect(methods).toHaveLength(2);
  });
});

describe("turning one off", () => {
  it("takes the credential away at the provider", async () => {
    const { identity, service } = setup([app]);

    await service.disable(principal, "authenticator-app");

    expect(identity.removeSecondFactor).toHaveBeenCalledWith(
      "subject-marcus",
      "credential-otp",
    );
  });

  it("records it", async () => {
    const { events, service } = setup([app]);

    await service.disable(principal, "authenticator-app");

    expect(events.record).toHaveBeenCalledWith(
      "marcus",
      "TwoFactorDisabled",
      expect.stringContaining("Authenticator app"),
      "Mac OS",
    );
  });

  /* A page that has been open a while. Answering "done" would have the card
   * report a change that never happened. */
  it("refuses a factor the account does not have", async () => {
    const { identity, service } = setup([]);

    await expect(
      service.disable(principal, "authenticator-app"),
    ).rejects.toThrow("not turned on");
    expect(identity.removeSecondFactor).not.toHaveBeenCalled();
  });

  it("answers the list as it now stands", async () => {
    const { identity, service } = setup([app]);
    identity.secondFactors
      .mockResolvedValueOnce([app])
      .mockResolvedValueOnce([]);

    const methods = await service.disable(principal, "authenticator-app");

    expect(methods[0]).toMatchObject({ Configured: false });
  });
});

describe("making a set of recovery codes", () => {
  const written = [
    { RemainingCount: 10, CodeCount: 10, CreatedAt: new Date() },
  ];

  it("makes ten of them", async () => {
    const { service } = setup([], written);

    const made = await service.generateRecoveryCodes(principal);

    expect(made.Codes).toHaveLength(10);
  });

  /* Read off a screen and typed back in somewhere else, so: one shape, no
   * characters that look like other characters, and a hyphen in the middle
   * that the way in takes back out. */
  it("prints them in a shape somebody can read back", async () => {
    const { service } = setup([], written);

    const made = await service.generateRecoveryCodes(principal);

    for (const code of made.Codes) {
      expect(code).toMatch(/^[a-z2-9]{5}-[a-z2-9]{5}$/);
      expect(code).not.toMatch(/[0o1li uv]/);
    }
  });

  it("gives every code a different value", async () => {
    const { service } = setup([], written);

    const made = await service.generateRecoveryCodes(principal);

    expect(new Set(made.Codes).size).toBe(10);
  });

  /* The whole reason the answer above is the only place these exist. What
   * reaches the database is a hash, and a hash of the code without its
   * printed hyphen, which is what the way in hashes too. */
  it("stores hashes and never the codes themselves", async () => {
    const { db, service } = setup([], written);

    const made = await service.generateRecoveryCodes(principal);

    const [, values] = db.query.mock.calls[0]!;
    const [subject, hashes] = values as [string, string[]];
    expect(subject).toBe("subject-marcus");
    expect(hashes).toHaveLength(10);
    for (const hash of hashes) expect(hash).toMatch(/^[0-9a-f]{64}$/);
    for (const code of made.Codes) expect(hashes).not.toContain(code);
  });

  it("records that the earlier codes have stopped working", async () => {
    const { events, service } = setup([], written);

    await service.generateRecoveryCodes(principal);

    expect(events.record).toHaveBeenCalledWith(
      "marcus",
      "RecoveryCodesGenerated",
      expect.stringContaining("stopped working"),
      "Mac OS",
    );
  });
});

describe("reading what is left of them", () => {
  it("says how many are spendable, out of how many, and when they were made", async () => {
    const made = new Date("2026-09-20T09:00:00.000Z");
    const { service } = setup(
      [],
      [{ RemainingCount: 7, CodeCount: 10, CreatedAt: made }],
    );

    await expect(service.recoveryCodes(principal)).resolves.toEqual({
      Remaining: 7,
      Total: 10,
      GeneratedAt: made,
    });
  });

  /* The function answers a row of zeros for an account that never made a set,
   * so no row at all is a read that went wrong. It is a line on a card either
   * way, and a card that refused to draw over it would be worse. */
  it("draws none yet rather than failing when the read comes back empty", async () => {
    const { service } = setup([], []);

    await expect(service.recoveryCodes(principal)).resolves.toEqual({
      Remaining: 0,
      Total: 0,
      GeneratedAt: null,
    });
  });
});

describe("spending one from the login card", () => {
  const spent = [{ RemainingCount: 9 }];

  it("takes every second factor off the account", async () => {
    const { identity, service } = setup([app], spent);

    const used = await service.useRecoveryCode(
      "marcus",
      "secret",
      "abcde-fghij",
    );

    expect(identity.removeSecondFactor).toHaveBeenCalledWith(
      "subject-marcus",
      "credential-otp",
    );
    expect(used.TwoFactorRemoved).toBe(true);
    expect(used.Remaining).toBe(9);
  });

  /* The password matters as much as the code: a sheet found in a drawer must
   * not be enough on its own to strip the protection off an account. */
  it("checks the password before it spends anything", async () => {
    const { db, identity, service } = setup([app], spent);
    identity.verifyPassword.mockResolvedValue(false);

    await expect(
      service.useRecoveryCode("marcus", "wrong", "abcde-fghij"),
    ).rejects.toThrow("do not match an account");
    expect(db.query).not.toHaveBeenCalled();
    expect(identity.removeSecondFactor).not.toHaveBeenCalled();
  });

  /* The check runs on the client whose direct grant has no second factor in
   * it -- see KeycloakAdminService.verifyPassword. Asserted here because the
   * whole flow is for somebody who cannot produce a code. */
  it("checks it against the account the provider named, not the typed name", async () => {
    const { identity, service } = setup([app], spent);

    await service.useRecoveryCode(
      "MARCUS@example.test",
      "secret",
      "abcde-fghij",
    );

    expect(identity.verifyPassword).toHaveBeenCalledWith("marcus", "secret");
  });

  it("refuses a code the database will not spend", async () => {
    const { identity, service } = setup([app], []);

    await expect(
      service.useRecoveryCode("marcus", "secret", "abcde-fghij"),
    ).rejects.toThrow("do not match an account");
    expect(identity.removeSecondFactor).not.toHaveBeenCalled();
  });

  it("refuses an account the provider does not know", async () => {
    const { db, identity, service } = setup([app], spent);
    identity.findAccount.mockResolvedValue(null);

    await expect(
      service.useRecoveryCode("nobody", "secret", "abcde-fghij"),
    ).rejects.toThrow("do not match an account");
    expect(db.query).not.toHaveBeenCalled();
  });

  /* One sentence, whatever went wrong. Anything that varied would make this
   * form the product's own account lookup: type a name, watch which answers
   * come back different. */
  it("says the same thing however it fails", async () => {
    const wrongPassword = setup([app], spent);
    wrongPassword.identity.verifyPassword.mockResolvedValue(false);
    const noAccount = setup([app], spent);
    noAccount.identity.findAccount.mockResolvedValue(null);
    const wrongCode = setup([app], []);

    const sentences = await Promise.all(
      [wrongPassword, noAccount, wrongCode].map((each) =>
        each.service
          .useRecoveryCode("marcus", "secret", "abcde-fghij")
          .catch((failure: unknown) => (failure as Error).message),
      ),
    );

    expect(new Set(sentences).size).toBe(1);
  });

  it("hashes the code the same way it stored it, hyphen or no hyphen", async () => {
    const withHyphen = setup([app], spent);
    await withHyphen.service.useRecoveryCode("marcus", "secret", "abcdefghij");
    const [, first] = withHyphen.db.query.mock.calls[0]!;

    const plain = setup([app], spent);
    await plain.service.useRecoveryCode("marcus", "secret", "abcdefghij");
    const [, second] = plain.db.query.mock.calls[0]!;

    expect((first as string[])[1]).toBe((second as string[])[1]);
  });

  it("records it, and says that the factor went with it", async () => {
    const { events, service } = setup([app], spent);

    await service.useRecoveryCode("marcus", "secret", "abcde-fghij");

    expect(events.record).toHaveBeenCalledWith(
      "marcus",
      "RecoveryCodeUsed",
      expect.stringContaining("turned off"),
    );
  });

  /* An account with codes and no factor: the code is still spent, and the
   * sentence does not claim something was turned off. */
  it("spends the code on an account that had no factor, and says so", async () => {
    const { events, service } = setup([], spent);

    const used = await service.useRecoveryCode(
      "marcus",
      "secret",
      "abcde-fghij",
    );

    expect(used.TwoFactorRemoved).toBe(false);
    expect(events.record).toHaveBeenCalledWith(
      "marcus",
      "RecoveryCodeUsed",
      expect.not.stringContaining("turned off"),
    );
  });
});
