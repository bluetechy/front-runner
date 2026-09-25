import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { SignInMethod } from "./single-sign-on.model.js";

/*
 * One row of the SSO card, and what is deliberately not on it.
 *
 * Nothing here is a credential. A connected provider means somebody else holds
 * one on this account's behalf, and the only things this API answers about it
 * are which provider, what the account is called over there, and what may be
 * done about it from this page. The id the account holds at Google is read
 * past in the Keycloak implementation and never reaches this shape.
 */

const fields = Object.getOwnPropertyNames(new SignInMethod());

describe("what the card is drawn from", () => {
  it("is the provider, its name, and the four things a row says", () => {
    expect(fields).toEqual([
      "Alias",
      "Name",
      "Available",
      "Connected",
      "ConnectedAs",
      "CanDisconnect",
    ]);
  });

  it("carries no token, no secret and no id from the provider", () => {
    expect(
      fields.filter((field) => /token|secret|userid|password/i.test(field)),
    ).toEqual([]);
  });
});
