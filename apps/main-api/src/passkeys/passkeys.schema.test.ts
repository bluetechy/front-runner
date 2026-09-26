import { describe, expect, it } from "@jest/globals";
import { passkeyIdSchema } from "./passkeys.schema.js";

/*
 * The one thing this vertical is told: which passkey an operation is about.
 *
 * What is worth asserting is mostly what this does *not* refuse. The id is
 * the identity provider's to shape, and a rule tight enough to be useful --
 * a UUID, say -- would be this vertical knowing which provider is behind the
 * port. So the shape is checked only as far as "there is something here and
 * it is not somebody leaning on the door", and whether it names a credential
 * is the provider's answer.
 */

describe("which passkey an operation is about", () => {
  it("takes the provider's own handle as it was read back", () => {
    expect(passkeyIdSchema.parse("8f14e45f-ceea-467a-9f77-2b2f0a6e7a3c")).toBe(
      "8f14e45f-ceea-467a-9f77-2b2f0a6e7a3c",
    );
  });

  /* The point of the file. A provider that addressed its credentials some
   * other way would still work here, and nothing above the port would have
   * to be told. */
  it("does not insist on the shape this provider happens to use", () => {
    expect(passkeyIdSchema.parse("credential/17")).toBe("credential/17");
  });

  it("trims what surrounds it", () => {
    expect(passkeyIdSchema.parse("  credential-1  ")).toBe("credential-1");
  });

  it("refuses an empty id, which names nothing", () => {
    expect(() => passkeyIdSchema.parse("   ")).toThrow(
      "That is not a passkey on this account.",
    );
  });

  it("refuses one long enough to be somebody probing", () => {
    expect(() => passkeyIdSchema.parse("a".repeat(256))).toThrow(
      "That is not a passkey on this account.",
    );
  });
});
