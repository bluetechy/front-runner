import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import "../language/i18n";
import { categories } from "./categories";
import { readDecision, recordDecision } from "./consent";
import { CookieConsentProvider, useCookieConsent } from "./cookie-consent";
import { CookiePreferences } from "./cookie-preferences";

/*
 * The fine-grained half: a switch per category.
 *
 * Three of these are requirements and say so: every optional switch starts
 * off, each category can be answered on its own, and closing the dialog
 * without pressing anything records nothing. The fourth -- that the strictly
 * necessary row is drawn and disabled rather than left out -- is not a
 * requirement, it is the rule that somebody reading the list is owed the
 * whole list.
 */

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

function useFakeStorage() {
  const entries = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
    clear: () => entries.clear(),
  });
}

beforeEach(useFakeStorage);

/* The dialog is opened by the provider rather than by a prop, because the
 * things that open it -- the notice, the pill, the privacy page -- are
 * nowhere near it. This is the smallest thing that can open it. */
function Opener() {
  const { edit } = useCookieConsent();
  return <button onClick={edit}>Open</button>;
}

function renderDialog() {
  render(
    <ThemeProvider theme={theme}>
      <CookieConsentProvider>
        <Opener />
        <CookiePreferences />
      </CookieConsentProvider>
    </ThemeProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Open" }));
}

const toggle = (name: string) => screen.getByRole("switch", { name });
const press = (label: string) =>
  fireEvent.click(screen.getByRole("button", { name: label }));

describe("what the dialog shows", () => {
  it("is closed until something opens it", () => {
    render(
      <ThemeProvider theme={theme}>
        <CookieConsentProvider>
          <CookiePreferences />
        </CookieConsentProvider>
      </ThemeProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("draws a row for every category there is", () => {
    renderDialog();

    for (const category of categories) {
      expect(toggle(category.label)).toBeInTheDocument();
    }
  });

  it("says what each one is for and what is kept under it", () => {
    renderDialog();

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "No analytics is installed on this site.",
    );
  });

  // A pre-ticked box has never been consent under the GDPR, and a dialog
  // that opens with the switches on is asking somebody to opt out.
  it("starts every optional category off on a first visit", () => {
    renderDialog();

    expect(toggle("Preferences")).not.toBeChecked();
    expect(toggle("Analytics")).not.toBeChecked();
    expect(toggle("Marketing")).not.toBeChecked();
  });

  // Drawn, and unmovable. Leaving it out would be a shorter list than the
  // one somebody is being asked to trust.
  it("shows the strictly necessary row on, and refuses to move it", () => {
    renderDialog();

    expect(toggle("Strictly necessary")).toBeChecked();
    expect(toggle("Strictly necessary")).toBeDisabled();
  });

  it("opens showing what was chosen last time", () => {
    recordDecision({
      necessary: true,
      preferences: false,
      analytics: true,
      marketing: false,
    });

    renderDialog();

    expect(toggle("Analytics")).toBeChecked();
    expect(toggle("Marketing")).not.toBeChecked();
  });
});

describe("answering one category at a time", () => {
  // Specific consent: allowing the counting without allowing the
  // advertising has to be possible, or the answer is not really an answer.
  it("saves analytics on and marketing off when that is what was set", () => {
    renderDialog();

    fireEvent.click(toggle("Analytics"));
    press("Save my choices");

    expect(readDecision()?.choices).toEqual({
      necessary: true,
      preferences: false,
      analytics: true,
      marketing: false,
    });
  });

  it("takes a category back off again", () => {
    recordDecision({
      necessary: true,
      preferences: true,
      analytics: true,
      marketing: true,
    });
    renderDialog();

    fireEvent.click(toggle("Marketing"));
    press("Save my choices");

    expect(readDecision()?.choices.marketing).toBe(false);
    expect(readDecision()?.choices.analytics).toBe(true);
  });
});

describe("the two answers at the foot of it", () => {
  it("is drawn the same way for refusing as for accepting", () => {
    renderDialog();

    const reject = screen.getByRole("button", { name: "Reject all" });
    const accept = screen.getByRole("button", { name: "Accept all" });

    expect(reject.className).toBe(accept.className);
  });

  it.each([
    ["Accept all", true],
    ["Reject all", false],
  ])(
    "records everything as %s says, whatever the switches were left at",
    (label, allowed) => {
      renderDialog();
      fireEvent.click(toggle("Analytics"));

      press(label);

      expect(readDecision()?.choices.analytics).toBe(allowed);
      expect(readDecision()?.choices.marketing).toBe(allowed);
    },
  );

  /* Material fades a dialog out rather than dropping it, so "closed" is a
   * moment later than the press. */
  it("closes once an answer has been recorded", async () => {
    renderDialog();

    press("Save my choices");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("closing it without answering", () => {
  // No answer is still no answer. The notice underneath is still there, and
  // nothing has been allowed on the strength of a dialog being looked at.
  it("records nothing at all", () => {
    renderDialog();
    fireEvent.click(toggle("Marketing"));

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(readDecision()).toBeNull();
  });

  it("forgets the switches that were moved and not saved", async () => {
    renderDialog();
    fireEvent.click(toggle("Marketing"));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    /* The page underneath is hidden from a screen reader while a dialog is
     * over it, so the button that opens it again is only reachable once the
     * dialog has actually gone. */
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(toggle("Marketing")).not.toBeChecked();
  });
});
