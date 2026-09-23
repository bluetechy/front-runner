/*
 * The four things a cookie can be for on this site, and what is actually
 * kept under each one today.
 *
 * They are a list rather than four components so that the notice, the
 * preferences dialog and the privacy page all read the same four sentences:
 * a category described one way on the banner and another way in the dialog is
 * two descriptions of the same thing, and one of them is wrong.
 *
 * **Strictly necessary is the only one with anything behind it today.** The
 * other three are written as what they would cover, and say so plainly rather
 * than implying a tracker nobody installed. That is deliberate: the gate
 * (`useCookieConsent().allows`) has to exist before the thing it gates, or the
 * first script somebody adds goes in ungated.
 *
 * The language tag sits under "strictly necessary" rather than under
 * "preferences", which is a judgment and not an oversight. It is written only
 * when somebody picks a language from the top bar, it is read back only to
 * put the interface in the language they picked, and ePrivacy has always
 * treated a preference set at the visitor's own explicit request that way. It
 * never leaves the browser and it identifies nobody. See
 * docs/cookie-consent.md.
 *
 * `label`, `purpose` and `kept` are the English sentence and the translation
 * key both -- see `language/i18n.ts` -- so they are written untranslated here
 * and go through `t()` where they are drawn.
 */

export type CategoryId =
  "necessary" | "preferences" | "analytics" | "marketing";

export interface Category {
  id: CategoryId;
  /* The name beside the toggle. */
  label: string;
  /* What the category is for, in one line. */
  purpose: string;
  /* What this site keeps under it today. */
  kept: string;
  /* The one nobody can turn off, because turning it off is closing the tab. */
  required?: true;
}

/*
 * Read in this order, everywhere. Necessary is first because it is the one
 * that cannot be refused and saying so first is what makes the other three
 * read as a choice; marketing is last because it is the one most people came
 * to this box to refuse.
 */
export const categories: readonly Category[] = [
  {
    id: "necessary",
    label: "Strictly necessary",
    purpose:
      "What the site cannot work without. These are always on, and there is nothing here to turn off.",
    kept: "The token that keeps you signed in, the short-lived values that complete a sign-in, the language you picked, and the record of the choice you are making now.",
    required: true,
  },
  {
    id: "preferences",
    label: "Preferences",
    purpose:
      "Remembering how you like the site set up, beyond what it needs in order to work.",
    kept: "Nothing yet. Allowing it means a setting added later is remembered without asking you again.",
  },
  {
    id: "analytics",
    label: "Analytics",
    purpose:
      "Counting visits and which pages get read, so we know what to build next.",
    kept: "Nothing yet. No analytics is installed on this site.",
  },
  {
    id: "marketing",
    label: "Marketing",
    purpose:
      "Measuring advertising, and showing you advertising that is relevant to you.",
    kept: "Nothing yet. No advertising is installed on this site.",
  },
] as const;

/* Whether a category is one nobody is being asked about. It is a function
 * rather than a set so that adding a second required category is one line in
 * the list above and nothing else. */
export function isRequired(category: CategoryId): boolean {
  return categories.find(({ id }) => id === category)?.required === true;
}
