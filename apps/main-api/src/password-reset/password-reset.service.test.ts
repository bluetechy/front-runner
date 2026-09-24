import { describe, expect, it, jest } from "@jest/globals";
import type { ConfigService } from "@nestjs/config";
import type { IdentityAdminService } from "../authentication/index.js";
import type { DatabaseService } from "../database/index.js";
import type { MailService } from "../mail/index.js";
import { PasswordResetService } from "./password-reset.service.js";

/*
 * Forgetting a password and choosing a new one.
 *
 * Two assertions carry this file. A request for an account that is not here
 * comes back looking exactly like a request for one that is, because
 * otherwise this form is the product's own account lookup. And the token is
 * spent before the password is set, so a link that failed halfway is not
 * still live in a mailbox.
 */

const account = {
  subjectId: "subject-member",
  username: "marcus",
  email: "marcus@example.test",
  firstName: "Marcus",
};

function setup() {
  const db = {
    query: jest.fn<(sql: string, values: unknown[]) => Promise<unknown[]>>(),
  };
  db.query.mockResolvedValue([{ SubjectId: "subject-member" }]);

  const mail = { send: jest.fn<(message: unknown) => Promise<boolean>>() };
  mail.send.mockResolvedValue(true);

  const keycloak = {
    findAccount: jest.fn<(identifier: string) => Promise<unknown>>(),
    account: jest.fn<(subjectId: string) => Promise<unknown>>(),
    setPassword: jest.fn<(id: string, password: string) => Promise<void>>(),
  };
  keycloak.findAccount.mockResolvedValue(account);
  keycloak.account.mockResolvedValue(account);
  keycloak.setPassword.mockResolvedValue(undefined);

  const config = { getOrThrow: () => "https://front.runner.test" };

  return {
    db,
    mail,
    keycloak,
    service: new PasswordResetService(
      db as unknown as DatabaseService,
      mail as unknown as MailService,
      keycloak as unknown as IdentityAdminService,
      config as unknown as ConfigService,
    ),
  };
}

const sentMessage = (mail: { send: { mock: { calls: unknown[][] } } }) =>
  mail.send.mock.calls[0]?.[0] as {
    to: string;
    subject: string;
    text: string;
    html: string;
  };

describe("asking for a link", () => {
  it("writes a token against the account the identity provider found", async () => {
    const { service, db, keycloak } = setup();

    await service.request("marcus");

    expect(keycloak.findAccount).toHaveBeenCalledWith("marcus");
    const [sql, values] = db.query.mock.calls[0] ?? [];
    expect(sql).toContain("StartPasswordReset");
    expect(values?.[0]).toBe("subject-member");
    // Cryptographically random, and made here rather than in the database.
    expect(values?.[1]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  // The address comes from the identity provider, never from the form. This is the whole
  // of what stops the form mailing a link wherever it is told to.
  it("mails the link to the address on the account", async () => {
    const { service, db, mail } = setup();

    await service.request("marcus");

    const message = sentMessage(mail);
    const token = db.query.mock.calls[0]?.[1]?.[1] as string;
    expect(message.to).toBe("marcus@example.test");
    expect(message.text).toContain(
      `https://front.runner.test/reset-password?token=${token}`,
    );
    expect(message.html).toContain(
      `https://front.runner.test/reset-password?token=${token}`,
    );
  });

  it("tells the reader how long the link lasts, and what to do if it was not them", async () => {
    const { service, mail } = setup();

    await service.request("marcus");

    const message = sentMessage(mail);
    expect(message.text).toContain("stops working after an hour");
    expect(message.text).toContain("If this was not you");
  });

  // The message reaches the account's own mailbox, so the name in it is not
  // a leak. Markup in that name would be, which is why it is escaped.
  it("escapes the login name it puts in the message", async () => {
    const { service, mail, keycloak } = setup();
    keycloak.findAccount.mockResolvedValue({
      ...account,
      username: "<script>marcus</script>",
    });

    await service.request("marcus");

    expect(sentMessage(mail).html).not.toContain("<script>");
    expect(sentMessage(mail).html).toContain("&lt;script&gt;");
  });

  // The point of the whole design: nothing about the answer changes.
  it("answers the same way for a name that matches nobody, and writes nothing", async () => {
    const { service, db, mail, keycloak } = setup();
    keycloak.findAccount.mockResolvedValue(null);

    await expect(service.request("nobody")).resolves.toEqual({
      Identifier: "nobody",
    });
    expect(db.query).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it("answers with the name it was given for an account that is here, too", async () => {
    const { service } = setup();

    await expect(service.request("marcus")).resolves.toEqual({
      Identifier: "marcus",
    });
  });

  // A mail server that is down must not turn into "no such account" on the
  // form, because the two are meant to be indistinguishable.
  it("says nothing different when the message could not be sent", async () => {
    const { service, mail } = setup();
    mail.send.mockResolvedValue(false);

    await expect(service.request("marcus")).resolves.toEqual({
      Identifier: "marcus",
    });
  });
});

describe("following the link", () => {
  it("spends the token and sets the password on the account it named", async () => {
    const { service, db, keycloak } = setup();

    await service.reset("a-token", "a-good-enough-password");

    expect(db.query.mock.calls[0]?.[0]).toContain("SpendPasswordReset");
    expect(db.query.mock.calls[0]?.[1]).toEqual(["a-token"]);
    expect(keycloak.setPassword).toHaveBeenCalledWith(
      "subject-member",
      "a-good-enough-password",
    );
  });

  it("answers with the login name, which is what to login with", async () => {
    const { service } = setup();

    await expect(
      service.reset("a-token", "a-good-enough-password"),
    ).resolves.toEqual({ LoginName: "marcus" });
  });

  // The other order would leave a link that failed at the provider still working.
  it("spends the token before it sets anything", async () => {
    const { service, db, keycloak } = setup();
    const order: string[] = [];
    db.query.mockImplementation(() => {
      order.push("spend");
      return Promise.resolve([{ SubjectId: "subject-member" }]);
    });
    keycloak.setPassword.mockImplementation(() => {
      order.push("set");
      return Promise.resolve();
    });

    await service.reset("a-token", "a-good-enough-password");

    expect(order).toEqual(["spend", "set"]);
  });

  it("refuses a token the database answered nothing for", async () => {
    const { service, db, keycloak } = setup();
    db.query.mockResolvedValue([]);

    await expect(service.reset("a-token", "a-password")).rejects.toThrow(
      "not valid or has already been used",
    );
    expect(keycloak.setPassword).not.toHaveBeenCalled();
  });

  // The account was deleted between the mail and the click. Setting a
  // password on a subject that no longer answers would be setting one on
  // nothing.
  it("refuses when the account is no longer at the identity provider", async () => {
    const { service, keycloak } = setup();
    keycloak.account.mockResolvedValue(null);

    await expect(service.reset("a-token", "a-password")).rejects.toThrow(
      "no longer here",
    );
    expect(keycloak.setPassword).not.toHaveBeenCalled();
  });

  it("passes a refusal from the identity provider on rather than claiming the password changed", async () => {
    const { service, keycloak } = setup();
    keycloak.setPassword.mockRejectedValue(
      new Error("invalid password: minimum length 8") as never,
    );

    await expect(service.reset("a-token", "short")).rejects.toThrow(
      "minimum length 8",
    );
  });
});
