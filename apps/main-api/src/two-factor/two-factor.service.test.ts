import { describe, expect, it, jest } from "@jest/globals";
import type {
  Account,
  IdentityAdminService,
  Principal,
  SecondFactor,
} from "../authentication/index.js";
import type { ConfigService } from "@nestjs/config";
import type { DatabaseService } from "../database/index.js";
import type { SecurityEventsService } from "../security-events/index.js";
import type { SmsService } from "../sms/index.js";
import { TwoFactorService } from "./two-factor.service.js";

/*
 * Two-factor authentication, and the way back in when it is lost.
 *
 * Five things here are worth more than the rest.
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
 *
 * **A phone number is written onto the account only after it has answered.**
 * Starting an enrollment changes nothing at the provider, and confirming one
 * writes the number the database says the code was sent to rather than any
 * number in the request. Between them, those two are the whole reason somebody
 * cannot point a second factor at a phone they do not own.
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

/* The SMS factor is an attribute rather than a credential at the provider, so
 * its id is the implementation's fixed word for one and its label is the
 * number already cut down to the last four digits. */
const phone: SecondFactor = {
  kind: "sms",
  id: "phone",
  label: "\u2022\u2022\u2022\u2022 0123",
  createdAt: new Date("2026-09-10T10:00:00.000Z"),
};

function setup(
  factors: SecondFactor[] = [],
  rows: unknown[] = [],
  { smsAvailable = true }: { smsAvailable?: boolean } = {},
) {
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
    setSecondFactorPhone:
      jest.fn<(subject: string, number: string) => Promise<void>>(),
  };
  identity.findAccount.mockResolvedValue(account);
  identity.verifyPassword.mockResolvedValue(true);
  identity.secondFactors.mockResolvedValue(factors);
  identity.removeSecondFactor.mockResolvedValue(undefined);
  identity.setSecondFactorPhone.mockResolvedValue(undefined);

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

  const sms = {
    available: smsAvailable,
    send: jest.fn<(to: string, text: string) => Promise<boolean>>(),
  };
  sms.send.mockResolvedValue(true);

  const config = {
    get: (key: string) => (key === "MAIL_FROM_NAME" ? "Front Runner" : ""),
  } as unknown as ConfigService;

  return {
    db,
    identity,
    events,
    sms,
    service: new TwoFactorService(
      db as unknown as DatabaseService,
      identity as unknown as IdentityAdminService,
      events as unknown as SecurityEventsService,
      sms as unknown as SmsService,
      config,
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
  it("keeps the SMS row and says it is not available where there is nowhere to send", async () => {
    const { service } = setup([app], [], { smsAvailable: false });

    const [, sms] = await service.methods(principal);

    expect(sms).toMatchObject({
      Kind: "sms",
      Available: false,
      Configured: false,
    });
  });

  it("offers SMS where there is somewhere to send", async () => {
    const { service } = setup([app]);

    const [, sms] = await service.methods(principal);

    expect(sms).toMatchObject({ Kind: "sms", Available: true });
  });

  /* A judgment about the method rather than about this deployment, so it does
   * not move when the credentials do. */
  it("never recommends SMS, available or not", async () => {
    for (const smsAvailable of [true, false]) {
      const { service } = setup([app], [], { smsAvailable });

      const [, sms] = await service.methods(principal);

      expect(sms).toMatchObject({ Recommended: false });
    }
  });

  it("marks the SMS row from the account, with the number already cut down", async () => {
    const { service } = setup([phone]);

    const [, sms] = await service.methods(principal);

    expect(sms).toMatchObject({
      Configured: true,
      ConfiguredAt: phone.createdAt,
      Label: "\u2022\u2022\u2022\u2022 0123",
    });
  });

  /* A number put on an account while the site could send messages is still on
   * it the week the credentials expire, and Keycloak is still asking for a
   * code. Drawing that as "off" would be telling somebody they have no second
   * factor while they do. */
  it("still says a number is configured when there is nowhere to send", async () => {
    const { service } = setup([phone], [], { smsAvailable: false });

    const [, sms] = await service.methods(principal);

    expect(sms).toMatchObject({ Available: false, Configured: true });
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

describe("turning the SMS factor off", () => {
  it("removes the number by the id the provider gave it", async () => {
    const { identity, service } = setup([app, phone]);

    await service.disable(principal, "sms");

    expect(identity.removeSecondFactor).toHaveBeenCalledWith(
      "subject-marcus",
      "phone",
    );
  });

  /* One kind at a time. Somebody turning off SMS keeps their authenticator
   * app, which is the whole reason the card has two rows. */
  it("leaves the authenticator app alone", async () => {
    const { identity, service } = setup([app, phone]);

    await service.disable(principal, "sms");

    expect(identity.removeSecondFactor).toHaveBeenCalledTimes(1);
  });

  it("says so when there was no number on the account", async () => {
    const { service } = setup([app]);

    await expect(service.disable(principal, "sms")).rejects.toThrow(
      "not turned on",
    );
  });
});

/*
 * Attaching a phone number, which is the one factor this API sets up itself.
 *
 * It is two operations because the proof is a round trip through a handset,
 * and the split is where all the safety is: the first writes nothing onto the
 * account, and the second writes a number it read out of the database rather
 * than one it was handed.
 */
describe("starting an SMS enrollment", () => {
  it("sends a code and writes the number down as unproved", async () => {
    const { db, sms, service } = setup([], [{ SentAt: new Date() }]);

    await service.startSmsEnrollment(principal, "+15555550123");

    expect(db.query.mock.calls[0]?.[0]).toContain("StartPhoneVerification");
    expect(db.query.mock.calls[0]?.[1]?.[0]).toBe("subject-marcus");
    expect(db.query.mock.calls[0]?.[1]?.[1]).toBe("+15555550123");
    expect(sms.send).toHaveBeenCalledWith(
      "+15555550123",
      expect.stringContaining("confirm this phone number"),
    );
  });

  /* The whole point of the first half. A number on the account before it has
   * answered is a second factor pointed at a phone somebody else is holding. */
  it("changes nothing at the provider", async () => {
    const { identity, service } = setup([], [{ SentAt: new Date() }]);

    await service.startSmsEnrollment(principal, "+15555550123");

    expect(identity.setSecondFactorPhone).not.toHaveBeenCalled();
  });

  /* Stored hashed, as every secret in this API is: a copy of the table must
   * not be a list of live codes. */
  it("stores a hash rather than the code it sent", async () => {
    const { db, sms, service } = setup([], [{ SentAt: new Date() }]);

    await service.startSmsEnrollment(principal, "+15555550123");

    const stored = String(db.query.mock.calls[0]?.[1]?.[2]);
    const message = String(sms.send.mock.calls[0]?.[1]);
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
    expect(message).not.toContain(stored);
  });

  it("reads the number back masked, so a mistyped digit is caught here", async () => {
    const { service } = setup([], [{ SentAt: new Date() }]);

    const started = await service.startSmsEnrollment(principal, "+15555550123");

    expect(started.PhoneNumber).toBe("•••• 0123");
  });

  it("says so rather than sending nowhere when SMS is not available", async () => {
    const { db, service } = setup([], [{ SentAt: new Date() }], {
      smsAvailable: false,
    });

    await expect(
      service.startSmsEnrollment(principal, "+15555550123"),
    ).rejects.toThrow("not available");
    expect(db.query).not.toHaveBeenCalled();
  });

  /* Reported, because the dialog is about to sit there waiting for digits
   * that are not coming. */
  it("says so when the message did not go out", async () => {
    const { sms, service } = setup([], [{ SentAt: new Date() }]);
    sms.send.mockResolvedValue(false);

    await expect(
      service.startSmsEnrollment(principal, "+15555550123"),
    ).rejects.toThrow("could not be sent");
  });
});

describe("confirming an SMS enrollment", () => {
  const proved = [{ PhoneNumber: "+15555550123" }];

  it("writes the number the database says the code was sent to", async () => {
    const { identity, service } = setup([], proved);

    await service.confirmSmsEnrollment(principal, "483920");

    expect(identity.setSecondFactorPhone).toHaveBeenCalledWith(
      "subject-marcus",
      "+15555550123",
    );
  });

  it("spends the code against the account the session names", async () => {
    const { db, service } = setup([], proved);

    await service.confirmSmsEnrollment(principal, "483920");

    expect(db.query.mock.calls[0]?.[0]).toContain("SpendPhoneVerification");
    expect(db.query.mock.calls[0]?.[1]?.[0]).toBe("subject-marcus");
  });

  it("sends a hash of the code rather than the code", async () => {
    const { db, service } = setup([], proved);

    await service.confirmSmsEnrollment(principal, "483920");

    expect(String(db.query.mock.calls[0]?.[1]?.[1])).toMatch(/^[0-9a-f]{64}$/);
  });

  it("records it, naming the last four digits and no more", async () => {
    const { events, service } = setup([], proved);

    await service.confirmSmsEnrollment(principal, "483920");

    const [, type, description] = events.record.mock.calls[0] ?? [];
    expect(type).toBe("TwoFactorEnabled");
    expect(description).toContain("0123");
    expect(description).not.toContain("+15555550123");
  });

  /* A wrong code, an expired one, five guesses already spent and nothing
   * started at all are one row-shaped absence from the database, and one
   * sentence out of here. */
  it("refuses a code the database will not spend, and writes nothing", async () => {
    const { identity, events, service } = setup([], []);

    await expect(
      service.confirmSmsEnrollment(principal, "483920"),
    ).rejects.toThrow("not right, or it has expired");
    expect(identity.setSecondFactorPhone).not.toHaveBeenCalled();
    expect(events.record).not.toHaveBeenCalled();
  });
});
