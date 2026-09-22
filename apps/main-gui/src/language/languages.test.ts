import { describe, expect, it } from "vitest";
import enUS from "./locales/en-US.json";
import esMX from "./locales/es-MX.json";
import { defaultLanguage, languageOf, languages } from "./languages";

describe("the languages the interface offers", () => {
  it("offers US English and Mexican Spanish, and defaults to the first", () => {
    expect(languages.map((language) => language.tag)).toEqual([
      "en-US",
      "es-MX",
    ]);
    expect(defaultLanguage.tag).toBe("en-US");
  });

  /* A tag that is not offered is what a stale localStorage value looks like:
   * somebody chose French, French was withdrawn, and they come back. */
  it("falls back to the default for a tag it does not offer", () => {
    expect(languageOf("fr-FR")).toBe(defaultLanguage);
    expect(languageOf(null)).toBe(defaultLanguage);
    expect(languageOf("es-MX").label).toBe("Español (México)");
  });

  /* The flag is a file in public/flags, and nothing fails loudly when it is
   * missing -- the image simply does not draw. */
  it("names a flag file that exists for every language", () => {
    for (const language of languages) {
      expect(language.flag).toMatch(/^[A-Z]{2}$/);
    }
  });
});

/*
 * The half of a translation that goes wrong quietly: a string added to the
 * English file and forgotten in the Spanish one renders in English, which
 * looks like a translation nobody has got to rather than the mistake it is.
 */
describe("the locale files", () => {
  it("say the same things in both languages", () => {
    expect(Object.keys(esMX).toSorted()).toEqual(Object.keys(enUS).toSorted());
  });

  it("keep the English file's keys as their own translation", () => {
    for (const [key, value] of Object.entries(enUS)) {
      expect(value).toBe(key);
    }
  });

  it("actually translate, rather than copying the English through", () => {
    for (const [key, value] of Object.entries(esMX)) {
      expect(value, `"${key}" is still in English`).not.toBe(key);
    }
  });
});
