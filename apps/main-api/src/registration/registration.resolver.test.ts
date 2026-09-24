import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { PUBLIC_OPERATION } from "../authentication/index.js";
import { RegistrationResolver } from "./registration.resolver.js";
import { RegistrationService } from "./registration.service.js";

/*
 * The one operation in this API that makes an account.
 *
 * The assertion that matters most is that it is @Public, and that this is the
 * only thing here that is: nobody registering has a session yet, and the
 * guard is global, so the marker is what lets this one through. It opens no
 * way in that the realm's own hosted registration page did not already offer
 * -- see the note on the resolver.
 */

const form = {
  Username: "marcus",
  Email: "marcus@example.test",
  FirstName: "Marcus",
  LastName: "Wright",
  Password: "a-good-enough-password",
};

const isPublic = (operation: string) =>
  Reflect.getMetadata(
    PUBLIC_OPERATION,
    RegistrationResolver.prototype[
      operation as keyof RegistrationResolver
    ] as object,
  ) === true;

function setup() {
  const account = { Username: "marcus", Email: "marcus@example.test" };
  const service = { register: jest.fn<(form: unknown) => Promise<unknown>>() };
  service.register.mockResolvedValue(account);
  return {
    account,
    service,
    resolver: new RegistrationResolver(
      service as unknown as RegistrationService,
    ),
  };
}

describe("making an account", () => {
  it("hands the form to the service and answers with what it made", async () => {
    const { resolver, service, account } = setup();

    await expect(resolver.register(form)).resolves.toBe(account);
    expect(service.register).toHaveBeenCalledWith(form);
  });
});

describe("who may ask", () => {
  // See the note at the top of the file.
  it("is public, because nobody registering has a session yet", () => {
    expect(isPublic("register")).toBe(true);
  });

  it("is the only public operation in this vertical", () => {
    const operations = Object.getOwnPropertyNames(
      RegistrationResolver.prototype,
    ).filter((name) => name !== "constructor");

    expect(operations.filter(isPublic)).toEqual(["register"]);
  });
});
