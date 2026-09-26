import { afterEach, describe, expect, it, vi } from "vitest";

/*
 * The bootstrap. What is worth asserting about it is that it mounts the page
 * into the element `index.html` promises, and that it says so plainly when that
 * element is not there -- a blank page with nothing in the console is the
 * hardest kind of failure to start from.
 */

const render = vi.fn();

vi.mock("react-dom/client", () => ({
  createRoot: () => ({ render }),
}));

vi.mock("./widget-tester", () => ({
  WidgetTester: () => null,
}));

afterEach(() => {
  vi.resetModules();
  render.mockReset();
  document.body.innerHTML = "";
});

describe("starting the widget tester", () => {
  it("mounts the page into the root element", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import("./main");
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("says what is missing when there is no root element", async () => {
    await expect(import("./main")).rejects.toThrow(/#root/);
  });
});
