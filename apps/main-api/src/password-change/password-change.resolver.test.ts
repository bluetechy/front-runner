import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { PUBLIC_OPERATION, type Principal } from "../authentication/index.js";
import { PasswordChangeResolver } from "./password-change.resolver.js";
import { PasswordChangeService } from "./password-change.service.js";

/*
 * The two operations an account uses on its own password.
 *
 * Neither is @Public, which is the difference between this vertical and the
 * reset one next door, and it is what this file is mostly about: the guard is
 * global, so the absence of the marker is the whole of what keeps a session in
 * front of these.
 *
 * The other assertion here is that the account comes off the principal. An
 * operation that took a login name as an argument would be a way to change
 * somebody else's password.
 */

const isPublic = (operation: keyof PasswordChangeResolver) =>
  Reflect.getMetadata(
    PUBLIC_OPERATION,
    PasswordChangeResolver.prototype[operation] as object,
  ) === true;

const principal: Principal = {
  userId: "b0000000-0000-4000-8000-000000000003",
  loginName: "marcus",
  sessionId: "session-now",
  device: "Mac OS",
};

function setup() {
  const service = {
    status: jest.fn<(principal: Principal) => Promise<unknown>>(),
    change:
      jest.fn<
        (
          principal: Principal,
          current: string,
          next: string,
        ) => Promise<unknown>
      >(),
  };
  service.status.mockResolvedValue({ ChangedAt: new Date("2026-09-01") });
  service.change.mockResolvedValue({
    ChangedAt: new Date("2026-09-24"),
    OtherSessionsEnded: 2,
  });
  return {
    service,
    resolver: new PasswordChangeResolver(
      service as unknown as PasswordChangeService,
    ),
  };
}

describe("who may reach these at all", () => {
  it("keeps a session in front of both of them", () => {
    expect(isPublic("passwordStatus")).toBe(false);
    expect(isPublic("changePassword")).toBe(false);
  });
});

describe("when the password was last set", () => {
  it("answers about the account the session is for", async () => {
    const { resolver, service } = setup();

    await expect(resolver.passwordStatus(principal)).resolves.toEqual({
      ChangedAt: new Date("2026-09-01"),
    });
    expect(service.status).toHaveBeenCalledWith(principal);
  });
});

describe("changing it", () => {
  it("hands over both passwords and the account they belong to", async () => {
    const { resolver, service } = setup();

    await expect(
      resolver.changePassword(principal, "letmein", "Trombone-42-Fig"),
    ).resolves.toEqual({
      ChangedAt: new Date("2026-09-24"),
      OtherSessionsEnded: 2,
    });
    expect(service.change).toHaveBeenCalledWith(
      principal,
      "letmein",
      "Trombone-42-Fig",
    );
  });

  /* The account is the session's, and there is nowhere in the signature for a
   * caller to name another one. */
  it("takes no account of its own, only the two passwords", () => {
    expect(PasswordChangeResolver.prototype.changePassword).toHaveLength(3);
  });
});
