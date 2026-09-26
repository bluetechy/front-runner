import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { CountdownElement, remainingParts } from "./countdown.js";
import type { CountdownNode } from "../definition.js";

/* A fixed now, so "two days from now" is the same two days on every run and
 * in every timezone the suite is run in. */
const NOW = new Date("2026-11-25T00:00:00.000Z");

const clock = (extra: Partial<CountdownNode> = {}): CountdownNode => ({
  id: "sale-clock",
  type: "countdown",
  target: "2026-11-27T00:00:00.000Z",
  ...extra,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("splitting what is left into units", () => {
  it("counts down in the units the format names", () => {
    expect(remainingParts(90_061_000, "DD:HH:MM:SS")).toEqual([
      { unit: "days", value: 1 },
      { unit: "hours", value: 1 },
      { unit: "minutes", value: 1 },
      { unit: "seconds", value: 1 },
    ]);
  });

  // The important one. A three-day sale shown as HH:MM:SS reads 72 hours: a
  // countdown that silently dropped two days would be the worst kind of wrong,
  // because it would look right.
  it("lets the largest unit shown carry the overflow", () => {
    expect(remainingParts(259_200_000, "HH:MM:SS")[0]).toEqual({
      unit: "hours",
      value: 72,
    });
    expect(remainingParts(3_600_000, "MM:SS")[0]).toEqual({
      unit: "minutes",
      value: 60,
    });
  });

  it("never counts past zero", () => {
    expect(remainingParts(-5000, "MM:SS")).toEqual([
      { unit: "minutes", value: 0 },
      { unit: "seconds", value: 0 },
    ]);
  });
});

describe("the clock on the page", () => {
  it("draws the time left, padded so the digits do not jump", () => {
    render(<CountdownElement node={clock()} />);
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("ticks once a second", () => {
    render(
      <CountdownElement
        node={clock({ target: "2026-11-25T00:00:59.000Z", format: "MM:SS" })}
      />,
    );
    expect(screen.getByText("59")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("58")).toBeInTheDocument();
  });

  // What happens at zero is the author's, and it has to be: a countdown that
  // reaches zero and sits there is the most common way one of these ends up
  // lying on a page for a month.
  it("says what the author wanted it to say once it has run out", () => {
    render(
      <CountdownElement
        node={clock({
          target: "2020-01-01T00:00:00.000Z",
          expired: { behavior: "replace", text: "THE SALE IS LIVE" },
        })}
      />,
    );
    expect(screen.getByText("THE SALE IS LIVE")).toBeInTheDocument();
  });

  it("can take itself off the page instead", () => {
    const { container } = render(
      <CountdownElement
        node={clock({
          target: "2020-01-01T00:00:00.000Z",
          expired: { behavior: "hide" },
        })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  // The deadline is announced once, as a fact. A politely announced update
  // every second would be a screen reader nobody can use to read the rest of
  // the page, which is worse than not hearing the seconds tick.
  it("announces the time remaining without announcing every tick", () => {
    const { container } = render(<CountdownElement node={clock()} />);
    expect(screen.getByText(/Time remaining/)).toBeInTheDocument();
    expect(container.querySelector("[aria-live]")).toBeNull();
    expect(container.querySelector("time")).toHaveAttribute(
      "dateTime",
      "2026-11-27T00:00:00.000Z",
    );
  });

  // The schema refuses one, so this is the belt to those suspenders: better
  // nothing than "NaN : NaN" on somebody's storefront.
  it("draws nothing for a target that is not a date", () => {
    const { container } = render(
      <CountdownElement node={clock({ target: "next Tuesday" })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  // An interval running for the life of the page to recompute the same expired
  // state is a battery cost with no reader.
  it("starts no timer for a countdown that has already finished", () => {
    render(
      <CountdownElement node={clock({ target: "2020-01-01T00:00:00.000Z" })} />,
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops its timer when it leaves the page", () => {
    const { unmount } = render(<CountdownElement node={clock()} />);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
