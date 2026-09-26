import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { Passkey, PasskeyRegistration } from "./passkeys.model.js";

/*
 * The two shapes the passkeys card is drawn from, and what is deliberately
 * not on them.
 *
 * A passkey has more to it at the provider than any other credential on this
 * page -- a public key, a signature counter, an authenticator's aaguid, the
 * transports it will answer over -- and none of it is here. A page that says
 * which passkeys you have has no use for any of it, and every field that is
 * not needed is a field that has to be kept honest forever.
 */

const fieldsOf = (shape: object) => Object.getOwnPropertyNames(shape);

describe("what a row of the passkeys card is drawn from", () => {
  it("is the handle that removes it, its name and its date, and nothing else", () => {
    expect(fieldsOf(new Passkey())).toEqual(["Id", "Label", "CreatedAt"]);
  });

  it("carries no key material, no counter and no device fingerprint", () => {
    expect(
      fieldsOf(new Passkey()).filter((field) =>
        /key|secret|public|counter|aaguid|attestation|transport/i.test(field),
      ),
    ).toEqual([]);
  });
});

describe("what comes back from the provider's registration page", () => {
  /* Two fields rather than one, because the page cannot work the first out
   * from the second: it left, and the list it remembers is from before it
   * went. */
  it("is whether one is new, beside the list as it now stands", () => {
    expect(fieldsOf(new PasskeyRegistration())).toEqual([
      "Registered",
      "Passkeys",
    ]);
  });
});
