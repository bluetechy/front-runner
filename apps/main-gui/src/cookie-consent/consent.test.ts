import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GOOD_FOR_MONTHS,
  STORAGE_KEY,
  VERSION,
  everything,
  forgetDecision,
  nothingOptional,
  readDecision,
  recordDecision,
} from "./consent";

/*
 * What this browser is holding, and the three ways a record stops counting.
 *
 * These are the assertions an auditor's questions turn into: silence is not
 * consent, a choice goes stale, and a choice made about four categories is
 * not a choice about five. Each of them fails safe -- towards asking again
 * rather than towards assuming a yes -- and that is what is pinned here.
 */

/*
 * The test's own storage, rather than the environment's. jsdom supplies a
 * real one, but Node 25 installs a `localStorage` global of its own that
 * shadows it and carries no methods, so the same test passes on the pinned
 * Node 24 and reads empty on a newer one. It is also a clean slate per test,
 * which the real one is not.
 */
function useFakeStorage() {
  const entries = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
    clear: () => entries.clear(),
  });
  return entries;
}

let storage: Map<string, string>;

beforeEach(() => {
  storage = useFakeStorage();
});

const JANUARY = new Date("2026-01-15T10:00:00.000Z");
const monthsAfter = (months: number) => {
  const later = new Date(JANUARY);
  later.setMonth(later.getMonth() + months);
  return later;
};

describe("a browser nobody has answered in", () => {
  // Silence is not consent, and neither is scrolling. Nothing is written
  // until a button is pressed, so there is nothing here to read.
  it("is holding no decision at all", () => {
    expect(readDecision()).toBeNull();
    expect(storage.size).toBe(0);
  });
});

describe("writing down what somebody chose", () => {
  it("reads back exactly what was agreed to", () => {
    recordDecision({ ...nothingOptional, analytics: true }, JANUARY);

    expect(readDecision(JANUARY)?.choices).toEqual({
      necessary: true,
      preferences: false,
      analytics: true,
      marketing: false,
    });
  });

  it("remembers when the button was pressed", () => {
    recordDecision(everything, JANUARY);

    expect(readDecision(JANUARY)?.at).toBe(JANUARY.toISOString());
  });

  // Refusing everything is still a record: it is what stops the box coming
  // back on the next page, and what an audit reads as a "no".
  it("writes a refusal down as firmly as an acceptance", () => {
    recordDecision(nothingOptional, JANUARY);

    const decision = readDecision(JANUARY);

    expect(decision).not.toBeNull();
    expect(decision?.choices.analytics).toBe(false);
    expect(decision?.choices.marketing).toBe(false);
  });

  it("keeps the necessary category on whatever was passed in", () => {
    recordDecision({ ...nothingOptional, necessary: false }, JANUARY);

    expect(readDecision(JANUARY)?.choices.necessary).toBe(true);
  });

  it("forgets it when it is told to, which puts the question back", () => {
    recordDecision(everything, JANUARY);
    forgetDecision();

    expect(readDecision(JANUARY)).toBeNull();
  });
});

describe("a record that has stopped counting", () => {
  // Six months is the CNIL's recommendation. Five months in, the answer
  // still stands; a day past six, the question is put again rather than
  // assuming somebody who agreed in January still agrees in July.
  it("still stands a month before it is due to be asked again", () => {
    recordDecision(everything, JANUARY);

    expect(readDecision(monthsAfter(GOOD_FOR_MONTHS - 1))).not.toBeNull();
  });

  it("is gone once it is older than six months", () => {
    recordDecision(everything, JANUARY);

    expect(readDecision(monthsAfter(GOOD_FOR_MONTHS + 1))).toBeNull();
  });

  // Consent to four categories is not consent to a fifth. Anything written
  // under an older set of categories is asked again rather than carried over.
  it("is gone when it was agreed to under an older set of categories", () => {
    recordDecision(everything, JANUARY);
    const written = JSON.parse(storage.get(STORAGE_KEY)!) as {
      version: number;
    };
    storage.set(
      STORAGE_KEY,
      JSON.stringify({ ...written, version: VERSION - 1 }),
    );

    expect(readDecision(JANUARY)).toBeNull();
  });
});

describe("a record that cannot be read", () => {
  // Somebody with the developer tools open, or an older shape of this file.
  // Every one of these reads as nobody having chosen, which asks again --
  // the failure worth having, because the other one runs a tracker on a
  // consent that was never given.
  it.each([
    ["is not JSON at all", "not json"],
    ["is JSON of the wrong shape", '{"choices":"yes"}'],
    ["has a date nobody could parse", '{"version":1,"at":"soon","choices":{}}'],
    ["is empty", ""],
  ])("asks again when what is stored %s", (_case, written) => {
    storage.set(STORAGE_KEY, written);

    expect(readDecision(JANUARY)).toBeNull();
  });
});

describe("a browser that refuses to remember anything", () => {
  // Private windows, and site data blocked. The one box on the site that
  // exists to respect a refusal must not be the thing that takes the page
  // down: it asks again next visit, which is the right failure.
  it("asks again rather than throwing", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("refused");
      },
      setItem: () => {
        throw new Error("refused");
      },
      removeItem: () => {
        throw new Error("refused");
      },
    });

    expect(() => recordDecision(everything, JANUARY)).not.toThrow();
    expect(readDecision(JANUARY)).toBeNull();
  });
});
