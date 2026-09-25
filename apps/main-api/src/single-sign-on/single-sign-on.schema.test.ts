import { describe, expect, it } from "@jest/globals";
import { aliasSchema } from "./single-sign-on.schema.js";

/*
 * What may be named as a provider.
 *
 * The shape rather than a list: the realm decides which providers exist, and a
 * schema naming the three we happen to ship icons for would have to be
 * rebuilt to add a fourth. What it is actually guarding is a URL path at the
 * identity provider, which is the one reason to check a string nobody will
 * ever read.
 */

const accepts = (alias: string) => aliasSchema.safeParse(alias).success;

describe("naming a login provider", () => {
  it("takes the aliases a realm actually uses", () => {
    expect(accepts("google")).toBe(true);
    expect(accepts("apple")).toBe(true);
    expect(accepts("azure-ad")).toBe(true);
    expect(accepts("saml.corp_2")).toBe(true);
  });

  it("takes the alias of a provider this application has never heard of", () => {
    expect(accepts("some-employers-saml")).toBe(true);
  });

  it("refuses an empty one", () => {
    expect(accepts("")).toBe(false);
    expect(accepts("   ")).toBe(false);
  });

  /* The whole reason the regex is there. None of these could get past the
   * quoting in the Keycloak implementation either, which is the point: this
   * is the belt. */
  it("refuses anything that would be a second path segment", () => {
    expect(accepts("google/../../realms")).toBe(false);
    expect(accepts("google?x=1")).toBe(false);
    expect(accepts("google google")).toBe(false);
  });

  it("refuses one longer than any alias", () => {
    expect(accepts("g".repeat(256))).toBe(false);
  });

  it("says something a person could act on", () => {
    const result = aliasSchema.safeParse("");
    expect(result.error?.issues[0]?.message).toBe("Name the login provider");
  });
});
