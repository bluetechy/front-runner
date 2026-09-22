import { afterEach, describe, expect, it, vi } from "vitest";
import { read, remove, write } from "./browser-storage";

/*
 * The whole reason this vertical exists: a browser may refuse storage
 * outright, and reading it then throws rather than answering null. Safari's
 * private mode does it, and so does Chrome inside an iframe with third-party
 * cookies blocked. An exception on the way to deciding whether anybody is
 * signed in would take the application down before it drew anything.
 *
 * So each of the three is asserted twice: once where storage works, and once
 * where touching it throws.
 */

function workingStorage() {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
    clear: () => entries.clear(),
  };
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("sessionStorage", storage);
  return entries;
}

/* A browser that refuses site data: the property itself throws. */
function refusingStorage() {
  for (const name of ["localStorage", "sessionStorage"])
    Object.defineProperty(globalThis, name, {
      configurable: true,
      get() {
        throw new Error("The operation is insecure.");
      },
    });
}

const throwing = () => {
  throw new Error("QuotaExceededError");
};

/* Storage that exists and then fails, which is what a full quota looks like. */
function failingStorage() {
  vi.stubGlobal("localStorage", {
    getItem: throwing,
    setItem: throwing,
    removeItem: throwing,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("remembering something between visits", () => {
  it("writes a value and reads it back", () => {
    workingStorage();

    write("local", "front-runner.language", "es-MX");

    expect(read("local", "front-runner.language")).toBe("es-MX");
  });

  it("answers null for something never written", () => {
    workingStorage();

    expect(read("local", "front-runner.nothing")).toBeNull();
  });

  it("forgets what it is told to forget", () => {
    workingStorage();
    write("session", "front-runner.token", "a-token");

    remove("session", "front-runner.token");

    expect(read("session", "front-runner.token")).toBeNull();
  });

  // Two kinds, one wrapper. The caller says which, rather than this file
  // deciding what is worth surviving a closed tab.
  it("keeps the two kinds apart", () => {
    const entries = workingStorage();
    vi.stubGlobal("sessionStorage", {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });

    write("local", "front-runner.language", "es-MX");

    expect(entries.get("front-runner.language")).toBe("es-MX");
    expect(read("session", "front-runner.language")).toBeNull();
  });
});

describe("a browser that refuses to remember anything", () => {
  it("reads null rather than throwing", () => {
    refusingStorage();

    expect(() => read("local", "front-runner.language")).not.toThrow();
    expect(read("local", "front-runner.language")).toBeNull();
  });

  it("writes and forgets without throwing", () => {
    refusingStorage();

    expect(() =>
      write("local", "front-runner.language", "es-MX"),
    ).not.toThrow();
    expect(() => remove("local", "front-runner.language")).not.toThrow();
  });

  // Refusing is not the only failure: storage that exists can still be out of
  // room, and setItem throws then too.
  it("survives storage that exists and then fails", () => {
    failingStorage();

    expect(read("local", "front-runner.language")).toBeNull();
    expect(() =>
      write("local", "front-runner.language", "es-MX"),
    ).not.toThrow();
    expect(() => remove("local", "front-runner.language")).not.toThrow();
  });
});
