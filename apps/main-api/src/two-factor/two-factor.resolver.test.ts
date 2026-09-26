import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { PUBLIC_OPERATION, type Principal } from "../authentication/index.js";
import { TwoFactorResolver } from "./two-factor.resolver.js";
import { TwoFactorService } from "./two-factor.service.js";

/*
 * Seven operations, and which of them a stranger may reach.
 *
 * Six are behind the login: the guard is global, so the absence of the
 * @Public marker is the whole of what keeps a session in front of them. The
 * account comes off the principal every time and never off an argument -- an
 * operation that took a login name would be a way to strip the second factor
 * from somebody else's account.
 *
 * `useRecoveryCode` is the exception and has to be: being unable to login is
 * the situation it exists for. What it takes instead of a session is a
 * password and an unspent code, and the service answers one sentence however
 * it fails.
 *
 * There is no enable operation for the authenticator app, which is the shape
 * of the feature rather than an omission: turning that one on ends at the
 * provider's own page, with a browser, because the secret behind it is shown
 * to a person once. The two SMS operations are the same idea for a factor with
 * no secret to mint: send a code to a number, then prove it came back.
 */

const isPublic = (operation: keyof TwoFactorResolver) =>
  Reflect.getMetadata(
    PUBLIC_OPERATION,
    TwoFactorResolver.prototype[operation] as object,
  ) === true;

const principal: Principal = {
  userId: "b0000000-0000-4000-8000-000000000003",
  loginName: "marcus",
  sessionId: "session-now",
  device: "Mac OS",
};

function setup() {
  const service = {
    methods: jest.fn<(principal: Principal) => Promise<unknown>>(),
    confirm:
      jest.fn<(principal: Principal, kind: string) => Promise<unknown>>(),
    disable:
      jest.fn<(principal: Principal, kind: string) => Promise<unknown>>(),
    startSmsEnrollment:
      jest.fn<(principal: Principal, number: string) => Promise<unknown>>(),
    confirmSmsEnrollment:
      jest.fn<(principal: Principal, code: string) => Promise<unknown>>(),
    recoveryCodes: jest.fn<(principal: Principal) => Promise<unknown>>(),
    generateRecoveryCodes:
      jest.fn<(principal: Principal) => Promise<unknown>>(),
    useRecoveryCode:
      jest.fn<
        (identifier: string, password: string, code: string) => Promise<unknown>
      >(),
  };
  for (const stub of Object.values(service)) stub.mockResolvedValue({});
  return {
    service,
    resolver: new TwoFactorResolver(service as unknown as TwoFactorService),
  };
}

describe("who may reach these operations", () => {
  it("keeps a session in front of everything about an account's own factors", () => {
    expect(isPublic("twoFactorMethods")).toBe(false);
    expect(isPublic("recoveryCodes")).toBe(false);
    expect(isPublic("confirmTwoFactorMethod")).toBe(false);
    expect(isPublic("disableTwoFactorMethod")).toBe(false);
    expect(isPublic("generateRecoveryCodes")).toBe(false);
    expect(isPublic("startSmsEnrollment")).toBe(false);
    expect(isPublic("confirmSmsEnrollment")).toBe(false);
  });

  it("lets somebody who cannot login spend a recovery code", () => {
    expect(isPublic("useRecoveryCode")).toBe(true);
  });
});

describe("what each operation is given", () => {
  it("reads the account's factors for the session that asked", async () => {
    const { resolver, service } = setup();

    await resolver.twoFactorMethods(principal);

    expect(service.methods).toHaveBeenCalledWith(principal);
  });

  it("hands the confirmation the kind the browser came back with", async () => {
    const { resolver, service } = setup();

    await resolver.confirmTwoFactorMethod(principal, "authenticator-app");

    expect(service.confirm).toHaveBeenCalledWith(
      principal,
      "authenticator-app",
    );
  });

  it("hands the removal the kind, and the session it came from", async () => {
    const { resolver, service } = setup();

    await resolver.disableTwoFactorMethod(principal, "authenticator-app");

    expect(service.disable).toHaveBeenCalledWith(
      principal,
      "authenticator-app",
    );
  });

  it("makes a new set of codes for the session that asked", async () => {
    const { resolver, service } = setup();

    await resolver.generateRecoveryCodes(principal);

    expect(service.generateRecoveryCodes).toHaveBeenCalledWith(principal);
  });

  /* Three arguments and no principal, because there is no session to have
   * one: what stands in its place is the password beside the code. */
  it("takes a name, a password and a code from the login card", async () => {
    const { resolver, service } = setup();

    await resolver.useRecoveryCode("marcus", "secret", "abcdefghij");

    expect(service.useRecoveryCode).toHaveBeenCalledWith(
      "marcus",
      "secret",
      "abcdefghij",
    );
  });

  it("sends a code to the number the session's account typed", async () => {
    const { resolver, service } = setup();

    await resolver.startSmsEnrollment(principal, "+15555550123");

    expect(service.startSmsEnrollment).toHaveBeenCalledWith(
      principal,
      "+15555550123",
    );
  });

  /* The code and the principal, and no number. Which number it proves is the
   * database's answer rather than this request's claim. */
  it("confirms with the code alone", async () => {
    const { resolver, service } = setup();

    await resolver.confirmSmsEnrollment(principal, "483920");

    expect(service.confirmSmsEnrollment).toHaveBeenCalledWith(
      principal,
      "483920",
    );
  });
});
