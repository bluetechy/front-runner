import { describe, expect, it } from "vitest";
import AppleIcon from "@/shared/icons/AppleIcon";
import FacebookIcon from "@/shared/icons/FacebookIcon";
import GoogleIcon from "@/shared/icons/GoogleIcon";
import LinkIcon from "@/shared/icons/LinkIcon";
import { kindOf } from "./sso-kinds";

/*
 * Which mark stands for a login provider.
 *
 * The fallback is the point of the file, the way it is in `activity-kinds.ts`:
 * the realm decides which providers exist, so an API newer than this bundle
 * can answer with one this table has never heard of, and a row with a chain
 * link on it is better than no row.
 */

describe("the marks this bundle ships", () => {
  it("is the same three the login card offers", () => {
    expect(kindOf("google").Icon).toBe(GoogleIcon);
    expect(kindOf("facebook").Icon).toBe(FacebookIcon);
    expect(kindOf("apple").Icon).toBe(AppleIcon);
  });
});

describe("a provider this bundle has never met", () => {
  it("still gets a mark", () => {
    expect(kindOf("some-employers-saml").Icon).toBe(LinkIcon);
  });

  /* Aliases are the realm's own slugs, so nothing here may assume a shape:
   * an empty one and an odd one both draw rather than throwing. */
  it.each(["", "GOOGLE", "google-workspace", "oidc.partner"])(
    "draws %s rather than nothing",
    (alias) => {
      expect(typeof kindOf(alias).Icon).toBe("function");
    },
  );
});
