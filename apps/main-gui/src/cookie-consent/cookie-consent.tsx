import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isRequired, type CategoryId } from "./categories";
import {
  everything,
  nothingOptional,
  readDecision,
  recordDecision,
  type Choices,
  type Decision,
} from "./consent";

/*
 * Who may be asked to run, and whether anybody has been asked yet.
 *
 * This is the gate. Anything that would set a cookie, load a third-party
 * script, or measure a visit goes through `allows()` first, and gets `false`
 * until somebody has said otherwise -- including before the question has been
 * put at all, because silence is not consent.
 *
 * It sits in `routes/__root.tsx` rather than in either shell. The marketing
 * pages and the application are two shells that never appear together, and
 * this is the one thing in the product that belongs to both: a visitor who
 * answers the box on the pricing page has answered it for the dashboard too.
 *
 * The dialog's open state is here rather than inside the notice for the same
 * reason the decision is: the privacy page has a button that opens it, and
 * that page is nowhere near the box in the corner.
 */

interface ConsentState {
  /* What was chosen, or null when nobody has chosen yet -- which is what the
   * notice renders itself from. */
  decision: Decision | null;
  /* Whether this category may be used right now. */
  allows: (category: CategoryId) => boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  /* Whatever the toggles in the dialog were left at. */
  save: (choices: Choices) => void;
  /* The preferences dialog: whether it is up, and the two ways it moves. */
  editing: boolean;
  edit: () => void;
  closeEditor: () => void;
}

const ConsentContext = createContext<ConsentState | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  /* Read once, when the provider mounts. A choice made in another tab does
   * not reach this one until it is reloaded, which is the same bargain
   * `language` makes and for the same reason: nothing should change under
   * somebody mid-sentence. */
  const [decision, setDecision] = useState<Decision | null>(() =>
    readDecision(),
  );
  const [editing, setEditing] = useState(false);

  const save = useCallback((choices: Choices) => {
    setDecision(recordDecision(choices));
    setEditing(false);
  }, []);

  const acceptAll = useCallback(() => save(everything), [save]);
  const rejectAll = useCallback(() => save(nothingOptional), [save]);

  /* A required category is allowed before anybody has answered anything:
   * staying signed in is not one of the things being asked about. */
  const allows = useCallback(
    (category: CategoryId) =>
      isRequired(category) || decision?.choices[category] === true,
    [decision],
  );

  const edit = useCallback(() => setEditing(true), []);
  const closeEditor = useCallback(() => setEditing(false), []);

  const value = useMemo(
    () => ({
      decision,
      allows,
      acceptAll,
      rejectAll,
      save,
      editing,
      edit,
      closeEditor,
    }),
    [decision, allows, acceptAll, rejectAll, save, editing, edit, closeEditor],
  );

  return <ConsentContext value={value}>{children}</ConsentContext>;
}

/*
 * What may run, for anything that wants to run.
 *
 * Outside a provider this answers rather than throwing, the way `useLanguage`
 * does -- but where that one falls back to the default language, this one
 * falls back to the safe answer: nobody has chosen, and nothing optional is
 * allowed. A component rendered without the provider by mistake therefore
 * loads no trackers, which is the failure worth having.
 */
const WITHOUT_A_PROVIDER: ConsentState = {
  decision: null,
  allows: isRequired,
  acceptAll: () => undefined,
  rejectAll: () => undefined,
  save: () => undefined,
  editing: false,
  edit: () => undefined,
  closeEditor: () => undefined,
};

export function useCookieConsent(): ConsentState {
  return use(ConsentContext) ?? WITHOUT_A_PROVIDER;
}
