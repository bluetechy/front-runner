import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { defaultLanguage } from "./languages";
import enUS from "./locales/en-US.json";
import esMX from "./locales/es-MX.json";

/*
 * i18next, set up once for the whole app. Importing this module is what
 * starts it; `main.tsx` does that, and `language-preference` reaches the
 * instance through it to change the language.
 *
 * Three deliberate departures from the same setup in `ordercalc-gui`, which
 * is where this library came from:
 *
 * - **No `i18next-browser-languagedetector`.** There is already one answer to
 *   "what language is this" -- the one `language-preference` keeps under
 *   `front-runner.language` -- and a detector with its own key, its own
 *   cookie and its own opinion would be a second. The provider tells i18next
 *   what it decided.
 * - **No `i18next-http-backend`.** Two languages of chrome is a few hundred
 *   bytes, so they are imported and bundled: nothing to fetch, and no moment
 *   where the interface is in English because the file has not landed yet.
 *   Switching to fetched files later is this file and nothing else.
 * - **Full tags, not `load: "languageOnly"`.** `es-MX` and `es-ES` are the
 *   two Spanishes this product will actually be asked for, and folding both
 *   to `es` throws away the distinction on the way in.
 *
 * Keys are the English sentence itself, the way ordercalc-gui writes them:
 * a string nobody has translated yet renders as itself rather than as a dotted
 * path. That is why both separators are off -- otherwise "Profile saved."
 * would be read as a path and "Search:" as a namespace.
 */

void i18next.use(initReactI18next).init({
  resources: {
    "en-US": { translation: enUS },
    "es-MX": { translation: esMX },
  },
  lng: defaultLanguage.tag,
  fallbackLng: defaultLanguage.tag,
  keySeparator: false,
  nsSeparator: false,
  /* React escapes what it renders; doing it twice turns an apostrophe into
   * `&#39;` on the screen. */
  interpolation: { escapeValue: false },
});

export default i18next;
