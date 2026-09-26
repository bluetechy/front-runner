import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { ParticlesElement } from "./particles.js";
import type { ParticlesNode } from "../definition.js";

const snow: ParticlesNode = { id: "snow", type: "particles", effect: "snow" };

/*
 * jsdom draws nothing: `getContext("2d")` answers null there, and installing a
 * real canvas implementation would be a compiled dependency in the lockfile
 * for one element. So the context is a stub, and what these tests asserts is
 * everything around the painting -- that the loop starts and stops, that the
 * element is invisible to a screen reader and to clicks, and that somebody who
 * asked for less motion is given none.
 *
 * What the snow actually looks like is not a thing any assertion can answer.
 * That is looked at in a browser, the way docs/testing.md sets out.
 */
const context = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  setTransform: vi.fn(),
  fillStyle: "",
};

let reduced = false;

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query.includes("reduced-motion"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => context,
  ) as unknown as HTMLCanvasElement["getContext"];
});

afterEach(() => {
  reduced = false;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the one element that is painted rather than built", () => {
  // The property that makes painting these pixels acceptable at all: the
  // widget reads exactly the same with the snow and without it.
  it("is nothing at all to a screen reader", () => {
    const { container } = render(<ParticlesElement node={snow} />);
    expect(container.querySelector("canvas")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  // A canvas laid over a banner would otherwise swallow the button it is
  // snowing on.
  it("lets clicks through to whatever is underneath it", () => {
    const { container } = render(<ParticlesElement node={snow} />);
    expect(container.querySelector("canvas")).toHaveStyle({
      pointerEvents: "none",
    });
  });

  it("paints on a frame loop", () => {
    const frame = vi.spyOn(window, "requestAnimationFrame");
    render(<ParticlesElement node={snow} />);
    expect(frame).toHaveBeenCalled();
  });

  // A widget unmounted with its loop still running is a page that never goes
  // quiet, on somebody else's site.
  it("stops painting when it leaves the page", () => {
    const stop = vi.spyOn(window, "cancelAnimationFrame");
    const { unmount } = render(<ParticlesElement node={snow} />);
    unmount();
    expect(stop).toHaveBeenCalled();
  });

  // Nothing is drawn rather than something slower. Static snow is not a
  // gentler version of falling snow, it is a grey speckle over a banner.
  it("draws nothing for somebody who asked for less motion", () => {
    reduced = true;
    const frame = vi.spyOn(window, "requestAnimationFrame");
    render(<ParticlesElement node={snow} />);
    expect(frame).not.toHaveBeenCalled();
  });

  // A document is not allowed to make somebody's phone warm: the author
  // chooses the look and the runtime keeps the cost.
  it("survives a document asking for far more particles than it may have", () => {
    expect(() =>
      render(<ParticlesElement node={{ ...snow, density: 10_000 }} />),
    ).not.toThrow();
  });
});
