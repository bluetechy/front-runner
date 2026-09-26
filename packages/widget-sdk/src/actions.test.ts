import { describe, expect, it, vi } from "vitest";
import { isSafeUrl, performAction } from "./actions.js";

describe("the URLs a definition is allowed to navigate to", () => {
  it("allows the two schemes a link on a page normally uses", () => {
    expect(isSafeUrl("https://northwind.test/sale")).toBe(true);
    expect(isSafeUrl("http://northwind.test/sale")).toBe(true);
  });

  // A banner with a phone number or an address on it is an ordinary widget.
  it("allows mailto and tel", () => {
    expect(isSafeUrl("mailto:help@northwind.test")).toBe(true);
    expect(isSafeUrl("tel:+15555550123")).toBe(true);
  });

  // The common case on a customer's own site: no scheme at all.
  it("allows a relative URL, a query and a fragment", () => {
    expect(isSafeUrl("/black-friday")).toBe(true);
    expect(isSafeUrl("?sale=1")).toBe(true);
    expect(isSafeUrl("#offers")).toBe(true);
  });

  // The whole reason this function exists. A definition carrying script is the
  // failure this platform is shaped to prevent, and this is the last place it
  // could get through.
  it("refuses script and the schemes that carry a document", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("JavaScript:alert(1)")).toBe(false);
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeUrl("blob:https://northwind.test/abc")).toBe(false);
  });

  // A browser strips control characters before resolving the scheme, so a
  // check that only looked at the first word would pass this and the browser
  // would still run it.
  it("refuses a scheme with a control character hidden in it", () => {
    expect(isSafeUrl("java\nscript:alert(1)")).toBe(false);
    expect(isSafeUrl("java\tscript:alert(1)")).toBe(false);
  });

  // Not dangerous, but a navigation off the site should be written as one:
  // `//evil.test` reads as a path to anybody skimming the document.
  it("refuses a protocol-relative URL", () => {
    expect(isSafeUrl("//evil.test/sale")).toBe(false);
  });

  it("refuses nothing at all", () => {
    expect(isSafeUrl("")).toBe(false);
    expect(isSafeUrl("   ")).toBe(false);
  });
});

describe("performing what a click asked for", () => {
  it("navigates, and says where it went", () => {
    const navigate = vi.fn();
    performAction({ type: "navigate", url: "/sale" }, "cta", { navigate });
    expect(navigate).toHaveBeenCalledWith("/sale", false);
  });

  it("opens a new tab only when the document asked for one", () => {
    const navigate = vi.fn();
    performAction(
      { type: "navigate", url: "https://northwind.test", newTab: true },
      "cta",
      { navigate },
    );
    expect(navigate).toHaveBeenCalledWith("https://northwind.test", true);
  });

  // The refused URL is the case worth being sure about: nothing happens, and
  // in particular the navigation does not.
  it("does nothing at all with a refused URL", () => {
    const navigate = vi.fn();
    const onEvent = vi.fn();
    performAction({ type: "navigate", url: "javascript:alert(1)" }, "cta", {
      navigate,
      onEvent,
    });
    expect(navigate).not.toHaveBeenCalled();
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("copies text, and tells the page it did", () => {
    const copy = vi.fn();
    const onEvent = vi.fn();
    performAction({ type: "copyText", text: "SAVE20" }, "code", {
      copy,
      onEvent,
    });
    expect(copy).toHaveBeenCalledWith("SAVE20");
    expect(onEvent).toHaveBeenCalledWith({
      type: "click",
      nodeId: "code",
      action: "copyText",
    });
  });

  // trackEvent does nothing but report, which is the point of it: the document
  // names something worth counting and the host page decides where counts go.
  it("reports a tracked event with its name and properties", () => {
    const onEvent = vi.fn();
    performAction(
      {
        type: "trackEvent",
        name: "banner_click",
        properties: { slot: "hero" },
      },
      "banner",
      { onEvent },
    );
    expect(onEvent).toHaveBeenCalledWith({
      type: "click",
      nodeId: "banner",
      action: "trackEvent",
      name: "banner_click",
      properties: { slot: "hero" },
    });
  });

  // Nothing in this package reports anywhere on its own. A widget that phoned
  // home from inside a customer's page without their asking is a widget their
  // privacy review removes.
  it("reports nowhere when the page passed no sink", () => {
    const copy = vi.fn();
    expect(() =>
      performAction({ type: "copyText", text: "x" }, "code", { copy }),
    ).not.toThrow();
  });
});
