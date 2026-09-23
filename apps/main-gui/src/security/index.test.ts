import { describe, expect, it } from "vitest";
import * as security from "./index";
import { Security } from "./security";
import { VerifyEmail } from "./verify-email";
import { useEmails } from "./email-api";

describe("what the security vertical offers the rest of the app", () => {
  // Two pages, because the verification link lands outside the login and the
  // settings page lives behind it, and the hook, because a route may want the
  // list without the page around it.
  it("offers its two pages and the hook behind them", () => {
    expect(Object.keys(security).toSorted()).toEqual([
      "Security",
      "VerifyEmail",
      "useEmails",
    ]);
  });

  it("offers the things themselves rather than copies of them", () => {
    expect(security.Security).toBe(Security);
    expect(security.VerifyEmail).toBe(VerifyEmail);
    expect(security.useEmails).toBe(useEmails);
  });

  // The pieces the page is assembled from are not part of the surface: a
  // vertical is reached through its barrel, and the table and the switch are
  // this page's business.
  it("does not offer the pieces the page is built from", () => {
    expect(Object.keys(security)).not.toContain("EmailList");
    expect(Object.keys(security)).not.toContain("PrivacyCard");
  });
});
