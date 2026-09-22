import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { read, write } from "../browser-storage";
import i18n from "./i18n";
import { defaultLanguage, languageOf, type Language } from "./languages";

/*
 * Which language the interface is asked to be in, remembered in this
 * browser.
 *
 * It is the browser's answer and not the profile's: a preference about how
 * this screen reads belongs to the screen somebody is reading it on, and
 * putting it on the account would mean a signed-out visitor could not have
 * one and a phone could not differ from a desktop. It was a column on
 * dbo.UserProfiles until 2026-09-22 and is not one now.
 *
 * This is the only thing that tells i18next what language to be in -- there
 * is no language detector, deliberately; see `i18n.ts`. **Only the chrome is
 * translated so far** (the rail and the top bar): the pages inside it are
 * still English until their strings go through `t()` and into
 * `locales/*.json`.
 */

const STORAGE_KEY = "front-runner.language";

interface LanguageState {
  language: Language;
  choose: (tag: string) => void;
}

const LanguageContext = createContext<LanguageState | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  /* Read once, when the provider mounts. Storage does not change underneath
   * a tab except by another tab, and a language that changed while somebody
   * was mid-sentence would be worse than one that waits for a reload. */
  const [language, setLanguage] = useState<Language>(() =>
    languageOf(read("local", STORAGE_KEY)),
  );

  /* i18next starts in the default language, so a remembered choice has to be
   * handed to it -- on the first render as much as on a later change. */
  useEffect(() => {
    if (i18n.language !== language.tag) void i18n.changeLanguage(language.tag);
  }, [language]);

  const choose = useCallback((tag: string) => {
    const chosen = languageOf(tag);
    setLanguage(chosen);
    write("local", STORAGE_KEY, chosen.tag);
  }, []);

  const value = useMemo(() => ({ language, choose }), [language, choose]);

  return <LanguageContext value={value}>{children}</LanguageContext>;
}

/*
 * The chosen language, for anything that renders in it.
 *
 * Outside a provider this answers the default rather than throwing, which is
 * the opposite of `useProfile`: there is no correct language to fail over
 * to for a profile, and there is one here. A test rendering a single control
 * should not have to build a provider to get a flag.
 */
const WITHOUT_A_PROVIDER: LanguageState = {
  language: defaultLanguage,
  choose: () => undefined,
};

export function useLanguage(): LanguageState {
  return use(LanguageContext) ?? WITHOUT_A_PROVIDER;
}
