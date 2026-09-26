import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { PUBLIC_OPERATION, type Principal } from "../authentication/index.js";
import { PasskeysResolver } from "./passkeys.resolver.js";
import { PasskeysService } from "./passkeys.service.js";

/*
 * Three operations, all of them behind the login.
 *
 * The guard is global, so the absence of the @Public marker is the whole of
 * what keeps a session in front of them; this asserts the absence, because a
 * marker added by accident is not something a reader would notice.
 *
 * The account comes off the principal every time and never off an argument.
 * An operation that took a login name would be a way to strip somebody else's
 * passwordless login off their account, and the one argument in this file is
 * the handle of a credential rather than the name of an account.
 *
 * `confirmPasskey` taking nothing is the assertion worth reading. The browser
 * comes back from the provider with a claim on the URL, and there is no
 * argument this resolver could accept that would be right to believe.
 */

const isPublic = (operation: keyof PasskeysResolver) =>
  Reflect.getMetadata(
    PUBLIC_OPERATION,
    PasskeysResolver.prototype[operation] as object,
  ) === true;

const principal: Principal = {
  userId: "b0000000-0000-4000-8000-000000000003",
  loginName: "marcus",
  sessionId: "session-now",
  device: "Mac OS",
};

function setup() {
  const service = {
    list: jest.fn<(principal: Principal) => Promise<unknown>>(),
    confirm: jest.fn<(principal: Principal) => Promise<unknown>>(),
    remove: jest.fn<(principal: Principal, id: string) => Promise<unknown>>(),
  };
  for (const stub of Object.values(service)) stub.mockResolvedValue({});
  return {
    service,
    resolver: new PasskeysResolver(service as unknown as PasskeysService),
  };
}

describe("who may reach these operations", () => {
  it("keeps a session in front of all three", () => {
    expect(isPublic("passkeys")).toBe(false);
    expect(isPublic("confirmPasskey")).toBe(false);
    expect(isPublic("removePasskey")).toBe(false);
  });
});

describe("reading the passkeys on the account", () => {
  it("asks about the account the token names", async () => {
    const { resolver, service } = setup();

    await resolver.passkeys(principal);

    expect(service.list).toHaveBeenCalledWith(principal);
  });
});

describe("coming back from the provider's registration page", () => {
  /* The assertion this file exists for. Nothing the page could say about
   * what happened over there is worth an argument here. */
  it("takes nothing from the caller but the session", async () => {
    const { resolver, service } = setup();

    await resolver.confirmPasskey(principal);

    expect(service.confirm).toHaveBeenCalledWith(principal);
    expect(service.confirm.mock.calls[0]).toHaveLength(1);
  });
});

describe("taking a passkey off the account", () => {
  it("passes the handle through beside the account it came from", async () => {
    const { resolver, service } = setup();

    await resolver.removePasskey(principal, "credential-passkey");

    expect(service.remove).toHaveBeenCalledWith(
      principal,
      "credential-passkey",
    );
  });
});
