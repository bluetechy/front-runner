import { describe, expect, it } from "vitest";
import { categories, isRequired } from "./categories";
import { CookieConsentProvider, useCookieConsent } from "./cookie-consent";
import { CookieNotice } from "./cookie-notice";
import * as cookieConsent from "./index";

/*
 * What the rest of the app may reach in here: the provider and the notice for
 * `routes/__root.tsx`, the hook for anything that wants to know whether it
 * may run, and the categories for the privacy page, which writes the same
 * four sentences out in prose.
 *
 * The dialog is not on the list. It is opened through the hook rather than
 * rendered by a caller, so that there is one of it.
 */

describe("what the cookie notice offers the rest of the app", () => {
  it("offers the provider, the notice, the hook and the categories", () => {
    expect(Object.keys(cookieConsent).toSorted()).toEqual([
      "CookieConsentProvider",
      "CookieNotice",
      "categories",
      "isRequired",
      "useCookieConsent",
    ]);
  });

  it("offers them themselves rather than copies of them", () => {
    expect(cookieConsent.CookieConsentProvider).toBe(CookieConsentProvider);
    expect(cookieConsent.CookieNotice).toBe(CookieNotice);
    expect(cookieConsent.useCookieConsent).toBe(useCookieConsent);
    expect(cookieConsent.categories).toBe(categories);
    expect(cookieConsent.isRequired).toBe(isRequired);
  });
});
