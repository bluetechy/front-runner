import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { PUBLIC_OPERATION } from "../authentication/index.js";
import { EmailsResolver } from "./emails.resolver.js";
import { EmailsService } from "./emails.service.js";

/*
 * Your own addresses and nobody else's: every operation but one takes the
 * login name from the token rather than from an argument.
 *
 * The one exception is verifyEmail, and the assertion that it is public is
 * the most important one in this file. The link in a verification mail is
 * followed by whoever opens that mailbox, which is the thing being proved;
 * requiring a session would refuse the case the feature exists for.
 */

const user = { userId: "user-id", loginName: "alice" };
const ADDRESS = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

function setup() {
  const addresses = ["the whole list"];
  const settings = { Addresses: addresses, EmailIsPrivate: false };
  const service = {
    settings: jest.fn().mockReturnValue(settings),
    add: jest.fn().mockResolvedValue({ addresses, sent: true } as never),
    remove: jest.fn().mockReturnValue(addresses),
    setPrimary: jest.fn().mockReturnValue(addresses),
    resend: jest.fn().mockResolvedValue({ addresses, sent: true } as never),
    setPrivacy: jest.fn().mockReturnValue(settings),
    verify: jest
      .fn()
      .mockResolvedValue({ Email: "alice@example.test" } as never),
  };
  return {
    addresses,
    settings,
    service,
    resolver: new EmailsResolver(service as unknown as EmailsService),
  };
}

describe("reading the security page", () => {
  it("reads the addresses of the account the token names", () => {
    const { resolver, service, settings } = setup();

    expect(resolver.emailSettings(user)).toBe(settings);
    expect(service.settings).toHaveBeenCalledWith("alice");
  });
});

describe("changing the list", () => {
  // Every one of these can move something else on the list: adding one can
  // be the account's first, and choosing a primary clears the old one. So
  // they answer with the whole list rather than the row they touched, the
  // same bargain the wallet makes.
  it("answers with the whole list rather than the row it touched", async () => {
    const { resolver, service, addresses } = setup();

    await expect(
      resolver.addEmail(user, "alice.work@example.test"),
    ).resolves.toBe(addresses);
    expect(resolver.removeEmail(user, ADDRESS)).toBe(addresses);
    expect(resolver.setPrimaryEmail(user, ADDRESS)).toBe(addresses);
    await expect(resolver.resendEmailVerification(user, ADDRESS)).resolves.toBe(
      addresses,
    );
    expect(service.add).toHaveBeenCalledWith(
      "alice",
      "alice.work@example.test",
    );
  });

  it("names the caller the token names, on every one of them", () => {
    const { resolver, service } = setup();

    void resolver.addEmail(user, "alice.work@example.test");
    resolver.removeEmail(user, ADDRESS);
    resolver.setPrimaryEmail(user, ADDRESS);
    void resolver.resendEmailVerification(user, ADDRESS);
    resolver.setEmailPrivacy(user, true);

    for (const call of [
      service.add,
      service.remove,
      service.setPrimary,
      service.resend,
      service.setPrivacy,
    ])
      expect(call.mock.calls[0]?.[0]).toBe("alice");
  });

  it("sets the privacy switch and answers with the whole page", () => {
    const { resolver, service, settings } = setup();

    expect(resolver.setEmailPrivacy(user, true)).toBe(settings);
    expect(service.setPrivacy).toHaveBeenCalledWith("alice", true);
  });
});

describe("following a verification link", () => {
  // The assertion this file exists for.
  it("is reachable without a session, because the token is the authorization", () => {
    expect(
      Reflect.getMetadata(
        PUBLIC_OPERATION,
        EmailsResolver.prototype.verifyEmail,
      ),
    ).toBe(true);
  });

  it("is the only operation here that is", () => {
    const publicOnes = [
      "emailSettings",
      "addEmail",
      "removeEmail",
      "setPrimaryEmail",
      "resendEmailVerification",
      "setEmailPrivacy",
      "verifyEmail",
    ].filter((name) =>
      Reflect.getMetadata(
        PUBLIC_OPERATION,
        EmailsResolver.prototype[
          name as keyof EmailsResolver
        ] as unknown as object,
      ),
    );

    expect(publicOnes).toEqual(["verifyEmail"]);
  });

  it("passes the token on and answers with the address that was confirmed", async () => {
    const { resolver, service } = setup();

    await expect(resolver.verifyEmail(ADDRESS)).resolves.toEqual({
      Email: "alice@example.test",
    });
    expect(service.verify).toHaveBeenCalledWith(ADDRESS);
  });
});
