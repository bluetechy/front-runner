import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { PUBLIC_OPERATION } from "../authentication/index.js";
import { PasswordResetResolver } from "./password-reset.resolver.js";
import { PasswordResetService } from "./password-reset.service.js";

/*
 * The two operations somebody who cannot login uses.
 *
 * Both are @Public, and that is what this file is mostly about: the guard is
 * global, so the marker is the whole of what lets these two through, and
 * being unable to login is exactly the situation they exist for.
 */

const isPublic = (operation: string) =>
  Reflect.getMetadata(
    PUBLIC_OPERATION,
    PasswordResetResolver.prototype[
      operation as keyof PasswordResetResolver
    ] as object,
  ) === true;

function setup() {
  const service = {
    request: jest.fn<(identifier: string) => Promise<unknown>>(),
    reset: jest.fn<(token: string, password: string) => Promise<unknown>>(),
  };
  service.request.mockResolvedValue({ Identifier: "marcus" });
  service.reset.mockResolvedValue({ LoginName: "marcus" });
  return {
    service,
    resolver: new PasswordResetResolver(
      service as unknown as PasswordResetService,
    ),
  };
}

describe("asking for a link", () => {
  it("hands the name to the service and answers with what came back", async () => {
    const { resolver, service } = setup();

    await expect(resolver.requestPasswordReset("marcus")).resolves.toEqual({
      Identifier: "marcus",
    });
    expect(service.request).toHaveBeenCalledWith("marcus");
  });
});

describe("following the link", () => {
  it("hands over the token and the new password", async () => {
    const { resolver, service } = setup();

    await expect(
      resolver.resetPassword("a-token", "a-good-enough-password"),
    ).resolves.toEqual({ LoginName: "marcus" });
    expect(service.reset).toHaveBeenCalledWith(
      "a-token",
      "a-good-enough-password",
    );
  });
});

describe("who may ask", () => {
  it.each(["requestPasswordReset", "resetPassword"])(
    "%s is public, because somebody who cannot login has no session",
    (operation) => {
      expect(isPublic(operation)).toBe(true);
    },
  );

  it("has no other operations, public or otherwise", () => {
    const operations = Object.getOwnPropertyNames(
      PasswordResetResolver.prototype,
    ).filter((name) => name !== "constructor");

    expect(operations.toSorted()).toEqual([
      "requestPasswordReset",
      "resetPassword",
    ]);
  });
});
