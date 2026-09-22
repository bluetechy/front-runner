/*
 * The languages the interface offers, and the flag that stands for each.
 *
 * Two of them for now. All 256 flags are already served from
 * `public/flags` -- see docs/shared/flags.md -- so offering another language
 * is a line in this list and nothing else.
 *
 * A tag is BCP 47 and a `flag` is ISO 3166, and they are separate fields
 * because they are separate things: `en-US` and `en-GB` are one language
 * under two flags, and a flag is a country rather than a tongue. Guessing
 * one from the other works until it doesn't.
 */

export interface Language {
  /* What is stored, and what a future translation layer would be handed. */
  tag: string;
  /* What the menu shows: each language written in itself, so somebody who
   * cannot read the current one can still find theirs. */
  label: string;
  /* Which file in `public/flags` to draw. */
  flag: string;
}

export const languages: readonly Language[] = [
  { tag: "en-US", label: "US English", flag: "US" },
  { tag: "es-MX", label: "Español (México)", flag: "MX" },
];

/* What an unanswered preference is. First in the list rather than a second
 * copy of "en-US", so the two cannot drift. */
export const defaultLanguage: Language = languages[0]!;

export function languageOf(tag: string | null): Language {
  return languages.find((language) => language.tag === tag) ?? defaultLanguage;
}
