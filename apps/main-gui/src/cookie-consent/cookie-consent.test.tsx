import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readDecision } from "./consent";
import { CookieConsentProvider, useCookieConsent } from "./cookie-consent";

/*
 * The gate: whether a thing that wants to run may run.
 *
 * The rule under every test here is that the answer is no until somebody has
 * said otherwise. Not "no unless it looks like they meant yes", and not "yes
 * because they did not object": nothing optional is allowed before a button
 * has been pressed, and a component rendered without the provider at all
 * gets the same no.
 */

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

/* A stand-in for anything that would like to set a cookie: it says what it is
 * allowed to do, and it presses the buttons a notice would press. */
function Tracker() {
  const { decision, allows, acceptAll, rejectAll, save, editing, edit } =
    useCookieConsent();

  return (
    <div>
      <p data-testid="answered">{decision === null ? "not yet" : "answered"}</p>
      <p data-testid="necessary">{String(allows("necessary"))}</p>
      <p data-testid="analytics">{String(allows("analytics"))}</p>
      <p data-testid="marketing">{String(allows("marketing"))}</p>
      <p data-testid="editing">{String(editing)}</p>
      <button onClick={acceptAll}>Accept</button>
      <button onClick={rejectAll}>Reject</button>
      <button
        onClick={() =>
          save({
            necessary: true,
            preferences: false,
            analytics: true,
            marketing: false,
          })
        }
      >
        Analytics only
      </button>
      <button onClick={edit}>Manage</button>
    </div>
  );
}

const renderTracker = () =>
  render(
    <CookieConsentProvider>
      <Tracker />
    </CookieConsentProvider>,
  );

const says = (what: string) => screen.getByTestId(what).textContent;
const press = (label: string) =>
  fireEvent.click(screen.getByRole("button", { name: label }));

describe("before anybody has answered", () => {
  it("has no decision to report", () => {
    renderTracker();

    expect(says("answered")).toBe("not yet");
  });

  // The whole point of the box. Nothing optional runs on the strength of
  // somebody not having said anything.
  it("allows nothing that was going to be asked about", () => {
    renderTracker();

    expect(says("analytics")).toBe("false");
    expect(says("marketing")).toBe("false");
  });

  // Staying signed in is not one of the things being asked about, so it is
  // not waiting on the answer either.
  it("allows what the site cannot work without", () => {
    renderTracker();

    expect(says("necessary")).toBe("true");
  });
});

describe("answering", () => {
  it("opens everything when everything is accepted", () => {
    renderTracker();

    press("Accept");

    expect(says("analytics")).toBe("true");
    expect(says("marketing")).toBe("true");
  });

  it("opens nothing when everything is rejected, and still counts as an answer", () => {
    renderTracker();

    press("Reject");

    expect(says("answered")).toBe("answered");
    expect(says("analytics")).toBe("false");
  });

  // Specific consent: allowing one purpose is not allowing the next one.
  it("opens one category without opening the others", () => {
    renderTracker();

    press("Analytics only");

    expect(says("analytics")).toBe("true");
    expect(says("marketing")).toBe("false");
  });

  it("writes the answer where the next visit will find it", () => {
    renderTracker();

    press("Analytics only");

    expect(readDecision()?.choices).toEqual({
      necessary: true,
      preferences: false,
      analytics: true,
      marketing: false,
    });
  });
});

describe("a visit after the answer was given", () => {
  it("starts from what was chosen last time rather than asking again", () => {
    renderTracker();
    press("Accept");

    /* A second visit: the same storage, a provider that has just mounted. */
    renderTracker();

    expect(screen.getAllByTestId("answered")[1]?.textContent).toBe("answered");
    expect(screen.getAllByTestId("marketing")[1]?.textContent).toBe("true");
  });
});

describe("the preferences dialog", () => {
  it("is closed until something asks for it", () => {
    renderTracker();

    expect(says("editing")).toBe("false");
  });

  it("opens when something asks for it", () => {
    renderTracker();

    press("Manage");

    expect(says("editing")).toBe("true");
  });

  // Saving is what closes it. A dialog still standing over the page after the
  // choice was taken is a choice somebody cannot tell they made.
  it("closes again when a choice is saved", () => {
    renderTracker();
    press("Manage");

    press("Accept");

    expect(says("editing")).toBe("false");
  });
});

describe("something rendered without the provider by mistake", () => {
  // The safe half of the fallback: `useLanguage` falls back to the default
  // language because there is a right answer to fall back to. Here the right
  // answer is no, so a component that has lost its provider loads nothing
  // rather than everything.
  it("is allowed nothing optional, and does not throw", () => {
    render(<Tracker />);

    expect(says("analytics")).toBe("false");
    expect(says("necessary")).toBe("true");
    expect(says("answered")).toBe("not yet");
  });

  it("does nothing at all when its buttons are pressed", () => {
    render(<Tracker />);

    press("Accept");

    expect(says("analytics")).toBe("false");
    expect(readDecision()).toBeNull();
  });
});
