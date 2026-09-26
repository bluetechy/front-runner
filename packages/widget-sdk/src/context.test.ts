import { describe, expect, it } from "vitest";
import {
  formatAmount,
  interpolate,
  numberFrom,
  withDefaults,
} from "./context.js";

describe("the placeholders a document may write", () => {
  it("puts the host page's value where the author left a gap", () => {
    expect(interpolate("Hello {{name}}", { name: "Ana" })).toBe("Hello Ana");
  });

  it("allows spaces inside the braces, because somebody will write them", () => {
    expect(interpolate("{{ name }}", { name: "Ana" })).toBe("Ana");
  });

  // A key nobody supplied leaves a gap rather than the template text. A widget
  // on a page that has not called its data layer yet should read as a sentence
  // with a hole in it, not as a template somebody forgot to render -- and the
  // hole is what tells the developer integrating it that the key is missing.
  it("leaves nothing behind for a key the page did not supply", () => {
    expect(interpolate("You are {{remaining}} away")).toBe("You are  away");
  });

  // Anything that is not a key is not a placeholder. A stray brace stays
  // visible instead of being silently eaten, which is the behavior that makes
  // a typo findable.
  it("leaves something that is not a key alone", () => {
    expect(interpolate("{{ not a key }}")).toBe("{{ not a key }}");
  });

  // The runtime's own values win over the page's, because they are the ones
  // the page could not have computed: `remaining` is the progress bar's.
  it("prefers the runtime's own value to a host key of the same name", () => {
    expect(
      interpolate(
        "{{remaining}}",
        { remaining: "page" },
        { remaining: "runtime" },
      ),
    ).toBe("runtime");
  });

  it("replaces every occurrence, not only the first", () => {
    expect(interpolate("{{a}} and {{a}}", { a: "x" })).toBe("x and x");
  });
});

describe("reading a number out of the host page's context", () => {
  it("takes a number as it is", () => {
    expect(numberFrom({ "cart.total": 50 }, "cart.total")).toBe(50);
  });

  // A cart total read out of somebody's DOM is a string, which is the ordinary
  // case rather than a mistake.
  it("takes a numeric string, because that is what a page usually has", () => {
    expect(numberFrom({ "cart.total": "50.25" }, "cart.total")).toBe(50.25);
  });

  it("answers nothing for a key that is not there", () => {
    expect(numberFrom({}, "cart.total")).toBeUndefined();
  });

  // Number("") is 0, and a bar drawn at zero looks like a fact. An empty
  // string is the absence of a number and has to answer as one.
  it("answers nothing for an empty string rather than nought", () => {
    expect(numberFrom({ "cart.total": "" }, "cart.total")).toBeUndefined();
    expect(numberFrom({ "cart.total": "   " }, "cart.total")).toBeUndefined();
  });

  it("answers nothing for something that is not a number at all", () => {
    expect(numberFrom({ "cart.total": "lots" }, "cart.total")).toBeUndefined();
  });
});

describe("the document's variables and the page's context", () => {
  // The document's are defaults so that a widget renders sensibly in a preview
  // where no page has supplied anything; the page wins because it knows.
  it("lets the page override what the document defaulted", () => {
    expect(withDefaults({ "cart.total": 0 }, { "cart.total": 50 })).toEqual({
      "cart.total": 50,
    });
  });

  it("keeps a default the page said nothing about", () => {
    expect(withDefaults({ tier: "gold" }, {})).toEqual({ tier: "gold" });
  });

  it("copes with neither of them existing", () => {
    expect(withDefaults(undefined, undefined)).toEqual({});
  });
});

describe("saying an amount", () => {
  it("is money when the author named a currency", () => {
    expect(formatAmount(25, "USD")).toContain("25");
    expect(formatAmount(25, "USD")).toMatch(/\$|USD/);
  });

  it("is a plain number when they did not", () => {
    expect(formatAmount(25.5)).toBe("25.5");
  });

  // An author's typo in a currency code is not worth taking the widget down
  // for: the number is the part the viewer needs.
  it("falls back to the number when the currency code is nonsense", () => {
    expect(formatAmount(25.5, "not-a-currency")).toBe("25.5");
  });
});
