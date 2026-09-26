import { describe, expect, it } from "vitest";
import LinkIcon from "@/shared/icons/LinkIcon";
import MobileIcon from "@/shared/icons/MobileIcon";
import PhoneIcon from "@/shared/icons/PhoneIcon";
import { kindOf } from "./two-factor-kinds";

/*
 * Which mark stands for a kind of second factor.
 *
 * The fallback is the assertion worth having, the same one `sso-kinds.ts` is
 * tested for: an API newer than this bundle can answer with a kind nobody
 * here has heard of, and a row with a chain link on it is better than a page
 * that throws.
 */

describe("the mark a second factor is drawn at", () => {
  it("draws an authenticator app as something in your hand", () => {
    expect(kindOf("authenticator-app").Icon).toBe(MobileIcon);
  });

  it("draws SMS as a call to a number", () => {
    expect(kindOf("sms").Icon).toBe(PhoneIcon);
  });

  it("draws a kind it has never heard of rather than nothing", () => {
    expect(kindOf("passkey").Icon).toBe(LinkIcon);
    expect(kindOf("").Icon).toBe(LinkIcon);
  });
});
