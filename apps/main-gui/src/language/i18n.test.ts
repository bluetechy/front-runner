import { afterEach, describe, expect, it } from "vitest";
import i18n from "./i18n";
import { defaultLanguage, languages } from "./languages";

/*
 * i18next, set up once for the whole app -- importing this module is what
 * starts it.
 *
 * Two of the choices in that setup are the ones worth holding: the keys are
 * English sentences rather than dotted paths, which only works while both
 * separators are off; and both languages are bundled rather than fetched, so
 * there is no moment where the interface is in English because a file has
 * not landed yet.
 */

afterEach(async () => {
  await i18n.changeLanguage(defaultLanguage.tag);
});

describe("how the interface is translated", () => {
  it("starts in the default language", () => {
    expect(i18n.language).toBe(defaultLanguage.tag);
  });

  it("carries every language the menu offers, with nothing to fetch", () => {
    for (const language of languages)
      expect(i18n.hasResourceBundle(language.tag, "translation")).toBe(true);
  });

  it("translates a sentence when asked in Spanish", async () => {
    await i18n.changeLanguage("es-MX");

    expect(i18n.t("Logout")).toBe("Cerrar sesión");
  });

  // The whole reason the keys are sentences: a string nobody has translated
  // yet renders as itself rather than as a dotted path in the middle of a
  // page.
  it("renders an untranslated sentence as itself", async () => {
    await i18n.changeLanguage("es-MX");

    expect(i18n.t("Something nobody has translated yet")).toBe(
      "Something nobody has translated yet",
    );
  });

  // Both separators are off for the same reason. With them on, "Profile
  // saved." would be read as a path and "Search:" as a namespace, and neither
  // would ever find its translation.
  it("reads a key with a full stop or a colon in it as one key", () => {
    expect(i18n.options.keySeparator).toBe(false);
    expect(i18n.options.nsSeparator).toBe(false);
    expect(i18n.t("Not set:")).toBe("Not set:");
  });

  // React escapes what it renders; doing it twice puts `&#39;` on the screen
  // where an apostrophe should be.
  it("leaves escaping to React", () => {
    expect(i18n.options.interpolation?.escapeValue).toBe(false);
    expect(i18n.t("It's {{thing}}", { thing: "here" })).toBe("It's here");
  });

  it("falls back to the default language rather than to a key", () => {
    expect(i18n.options.fallbackLng).toEqual([defaultLanguage.tag]);
  });
});
