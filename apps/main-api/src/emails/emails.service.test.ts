import { describe, expect, it, jest } from "@jest/globals";
import type { ConfigService } from "@nestjs/config";
import type { IdentityAdminService } from "../authentication/index.js";
import { DatabaseService } from "../database/index.js";
import type { MailService } from "../mail/index.js";
import type { SecurityEventsService } from "../security-events/index.js";
import { EmailsService } from "./emails.service.js";

/*
 * The calls behind the security page.
 *
 * Two things are worth more than the rest here and most of this file is
 * about them: the verification token is made in this process rather than in
 * the database, and making an address primary is two writes that have to
 * agree -- the database's copy and the identity provider's, in that order.
 */

const ADDRESS = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* The parameters of one call to the database, so the cast happens in one place
 * rather than at every assertion. A call that is not there is a failed test
 * rather than an undefined to chain off. */
const parametersOf = (
  query: jest.Mock<DatabaseService["query"]>,
  call = 0,
): string[] => {
  const parameters = query.mock.calls[call]?.[1];
  expect(parameters).toBeDefined();
  return parameters as string[];
};

function setup(rows: unknown[] = []) {
  const query = jest
    .fn<DatabaseService["query"]>()
    .mockResolvedValue(rows as never);
  const send = jest.fn<MailService["send"]>().mockResolvedValue(true);
  const setEmail = jest
    .fn<IdentityAdminService["setEmail"]>()
    .mockResolvedValue(undefined);
  const record = jest
    .fn<SecurityEventsService["record"]>()
    .mockResolvedValue(undefined);
  const config = {
    getOrThrow: () => "http://localhost",
  } as unknown as ConfigService;

  return {
    query,
    send,
    setEmail,
    record,
    service: new EmailsService(
      { query } as unknown as DatabaseService,
      { send } as unknown as MailService,
      { setEmail } as unknown as IdentityAdminService,
      { record } as unknown as SecurityEventsService,
      config,
    ),
  };
}

describe("reading the security page", () => {
  it("asks for the list and the privacy switch together", async () => {
    const { service, query } = setup([]);
    await service.settings("marcus");

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"GetUserEmails"'),
      ["marcus"],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"GetUserProfile"'),
      ["marcus"],
    );
  });

  // An account with no dbo.UserProfiles row has never been asked, and an
  // address nobody has offered to share is withheld. The column defaults to
  // true and dbo.GetUserProfile answers true, so the fallback here has to say
  // the same rather than publish an address by accident.
  it("reads a missing profile row as private", async () => {
    const { service } = setup([]);
    await expect(service.settings("marcus")).resolves.toEqual({
      Addresses: [],
      EmailIsPrivate: true,
    });
  });
});

describe("adding an address", () => {
  // The database has no source of randomness it should be trusted with for a
  // secret, and a guessable token is a way to attach an address somebody does
  // not own. So it is made here, and this is what says so.
  it("mints the verification token itself rather than letting the database", async () => {
    const { service, query } = setup([]);
    await service.add("marcus", "marcus.work@example.test");

    const parameters = parametersOf(query);
    expect(parameters[0]).toBe("marcus");
    expect(parameters[1]).toBe("marcus.work@example.test");
    expect(parameters[2]).toMatch(UUID);
  });

  it("gives every address a different token", async () => {
    const { service, query } = setup([]);
    await service.add("marcus", "one@example.test");
    await service.add("marcus", "two@example.test");

    const first = parametersOf(query, 0)[2];
    const second = parametersOf(query, 1)[2];
    expect(first).not.toBe(second);
  });

  // The row is written first: a message cannot carry a token that does not
  // exist yet, and a mail server that is down should not lose the address.
  it("writes the row before it sends anything", async () => {
    const order: string[] = [];
    const { service, query, send } = setup([]);
    query.mockImplementation(async () => {
      order.push("database");
      return [] as never;
    });
    send.mockImplementation(async () => {
      order.push("mail");
      return true;
    });

    await service.add("marcus", "marcus.work@example.test");
    expect(order).toEqual(["database", "mail"]);
  });

  it("mails the link to the address that was added", async () => {
    const { service, send } = setup([]);
    await service.add("marcus", "marcus.work@example.test");

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "marcus.work@example.test" }),
    );
  });

  // The token belongs in the link and nowhere else a reader can see it.
  it("puts the token in the link, in both parts of the message", async () => {
    const { service, query, send } = setup([]);
    await service.add("marcus", "marcus.work@example.test");

    const token = parametersOf(query)[2];
    const message = send.mock.calls[0]?.[0];
    expect(message?.text).toContain(
      `http://localhost/verify-email?token=${token}`,
    );
    expect(message?.html).toContain(
      `http://localhost/verify-email?token=${token}`,
    );
  });

  // The address is on file either way, with "Send another link" beside it.
  // Losing it because a mail server hiccuped would be the worse outcome.
  it("keeps the address when the mail cannot be sent, and says it did not go", async () => {
    const { service, send } = setup([]);
    send.mockResolvedValue(false);

    await expect(
      service.add("marcus", "marcus.work@example.test"),
    ).resolves.toEqual({ addresses: [], sent: false });
  });
});

describe("asking for another link", () => {
  it("replaces the token and mails the row it was written to", async () => {
    const { service, query, send } = setup([
      { UserEmailUUID: ADDRESS, Email: "marcus.work@example.test" },
    ]);
    await service.resend("marcus", ADDRESS);

    const parameters = query.mock.calls[0]?.[1] as string[];
    expect(parameters[2]).toMatch(UUID);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "marcus.work@example.test" }),
    );
  });

  // The message goes to the address the token actually verifies, read back
  // out of the answer, rather than to one the caller named.
  it("sends nothing when the address is not in the answer", async () => {
    const { service, send } = setup([]);
    await expect(service.resend("marcus", ADDRESS)).resolves.toEqual({
      addresses: [],
      sent: false,
    });
    expect(send).not.toHaveBeenCalled();
  });
});

describe("choosing the address somebody logs in with", () => {
  // The database refuses an unverified address and one belonging to somebody
  // else, so it goes first: only once it has agreed is there anything to tell
  // the identity provider.
  it("writes the database before it writes the identity provider", async () => {
    const order: string[] = [];
    const { service, query, setEmail } = setup([]);
    query.mockImplementation(async (text: string) => {
      order.push(text.includes("SetPrimaryUserEmail") ? "database" : "lookup");
      return (
        text.includes("SetPrimaryUserEmail")
          ? [{ UserEmailUUID: ADDRESS, Email: "marcus.work@example.test" }]
          : [{ SubjectId: "subject-marcus" }]
      ) as never;
    });
    setEmail.mockImplementation(async () => {
      order.push("provider");
    });

    await service.setPrimary("marcus", ADDRESS);
    expect(order[0]).toBe("database");
    expect(order.at(-1)).toBe("provider");
  });

  it("tells the identity provider the subject and the new address", async () => {
    const { service, query, setEmail } = setup([]);
    query.mockImplementation(
      async (text: string) =>
        (text.includes("SetPrimaryUserEmail")
          ? [{ UserEmailUUID: ADDRESS, Email: "marcus.work@example.test" }]
          : [{ SubjectId: "subject-marcus" }]) as never,
    );

    await service.setPrimary("marcus", ADDRESS);
    expect(setEmail).toHaveBeenCalledWith(
      "subject-marcus",
      "marcus.work@example.test",
    );
  });

  // Seeded and imported rows have no subject: they have never logged in, so
  // there is nothing at the provider to change, and dbo.ProvisionUser will
  // take the token's address on the first login anyway.
  it("skips the identity provider for an account that has never logged in", async () => {
    const { service, query, setEmail } = setup([]);
    query.mockImplementation(
      async (text: string) =>
        (text.includes("SetPrimaryUserEmail")
          ? [{ UserEmailUUID: ADDRESS, Email: "marcus.work@example.test" }]
          : [{ SubjectId: null }]) as never,
    );

    await service.setPrimary("marcus", ADDRESS);
    expect(setEmail).not.toHaveBeenCalled();
  });

  it("names the caller the token named, never one the request chose", async () => {
    const { service, query } = setup([]);
    await service.setPrimary("marcus", ADDRESS);
    expect(query.mock.calls[0]?.[1]?.[0]).toBe("marcus");
  });
});

describe("the rest of the writes", () => {
  it("removes an address as the caller the token named", async () => {
    const { service, query } = setup([]);
    await service.remove("marcus", ADDRESS);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"RemoveUserEmail"'),
      ["marcus", ADDRESS],
    );
  });

  it("sets the privacy switch and answers with the whole page", async () => {
    const { service, query } = setup([]);
    await service.setPrivacy("marcus", true);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"SetUserEmailPrivacy"'),
      ["marcus", true],
    );
  });
});

/*
 * Everything here that changes how somebody gets into their account is written
 * into their security log as well, because that log is what the RECENT ACTIVITY LOG
 * section of the same page shows. Nothing records a login yet -- those are
 * Keycloak's -- so these three are the rows a real account accumulates.
 */
describe("what reaches the security log", () => {
  it("records an email address being added, by the address rather than its id", async () => {
    const { service, record } = setup([]);
    await service.add("marcus", "work@example.test");

    expect(record).toHaveBeenCalledWith(
      "marcus",
      "EmailAdded",
      "work@example.test was added to your account.",
    );
  });

  // The argument is an id and the log wants the address, so it is read out of
  // the list as it stood before the write: "a2f1... was removed" tells nobody
  // anything.
  it("records an email address being removed, having looked up what it was", async () => {
    const { service, record } = setup([
      { UserEmailUUID: ADDRESS, Email: "old@example.test" },
    ]);
    await service.remove("marcus", ADDRESS);

    expect(record).toHaveBeenCalledWith(
      "marcus",
      "EmailRemoved",
      "old@example.test was removed from your account.",
    );
  });

  it("records nothing when there was no such email address to remove", async () => {
    const { service, record } = setup([]);
    await service.remove("marcus", ADDRESS);

    expect(record).not.toHaveBeenCalled();
  });

  // Recorded after the identity provider has agreed, never before. A log
  // saying the login changed when the credential did not is worse than no log:
  // this is the page somebody checks to find out what really happened.
  it("records a login being moved only once the provider has taken it", async () => {
    const { service, record, setEmail } = setup([
      { UserEmailUUID: ADDRESS, Email: "new@example.test", SubjectId: "s" },
    ]);
    await service.setPrimary("marcus", ADDRESS);

    expect(record).toHaveBeenCalledWith(
      "marcus",
      "PrimaryEmailChanged",
      "You login with new@example.test from now on.",
    );
    expect(setEmail.mock.invocationCallOrder[0]).toBeLessThan(
      record.mock.invocationCallOrder[0] as number,
    );
  });

  // The switch is a preference, not a way in. Nothing about it belongs on a
  // page headed with logins and password changes.
  it("records nothing for the privacy switch", async () => {
    const { service, record } = setup([]);
    await service.setPrivacy("marcus", true);

    expect(record).not.toHaveBeenCalled();
  });
});

describe("spending a verification token", () => {
  // No login name in the parameters, and that is the point: the link is
  // followed by whoever opens the mailbox, which is the thing being proved.
  it("asks the database with the token alone", async () => {
    const { service, query } = setup([
      { Email: "marcus.work@example.test", LoginName: "marcus" },
    ]);
    await service.verify(ADDRESS);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"VerifyUserEmail"'),
      [ADDRESS],
    );
  });

  it("answers with the address that was confirmed, and nothing else", async () => {
    const { service } = setup([
      { Email: "marcus.work@example.test", LoginName: "marcus" },
    ]);
    await expect(service.verify(ADDRESS)).resolves.toEqual({
      Email: "marcus.work@example.test",
    });
  });

  it("refuses rather than answering empty when the token matched nothing", async () => {
    const { service } = setup([]);
    await expect(service.verify(ADDRESS)).rejects.toThrow("not valid");
  });
});
