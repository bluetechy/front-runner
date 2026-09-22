import { describe, expect, it } from "vitest";
import * as language from "./index";
import { LanguageMenu } from "./language-menu";
import { LanguageProvider, useLanguage } from "./language-preference";
import { defaultLanguage, languageOf, languages } from "./languages";

/*
 * i18n itself is deliberately not here. It is started by `main.tsx`
 * importing it and reached through the provider afterwards; a vertical that
 * could import the instance could change the language behind the provider's
 * back, and then the interface and what is remembered would disagree.
 */

describe("what the language vertical offers the rest of the app", () => {
  it("offers the menu, the provider and its hook, and the list", () => {
    expect(Object.keys(language).toSorted()).toEqual([
      "LanguageMenu",
      "LanguageProvider",
      "defaultLanguage",
      "languageOf",
      "languages",
      "useLanguage",
    ]);
  });

  it("offers the things themselves rather than copies of them", () => {
    expect(language.LanguageMenu).toBe(LanguageMenu);
    expect(language.LanguageProvider).toBe(LanguageProvider);
    expect(language.useLanguage).toBe(useLanguage);
    expect(language.languages).toBe(languages);
    expect(language.languageOf).toBe(languageOf);
    expect(language.defaultLanguage).toBe(defaultLanguage);
  });

  it("does not offer the i18next instance", () => {
    expect(Object.keys(language)).not.toContain("default");
    expect(Object.keys(language)).not.toContain("i18n");
  });
});
