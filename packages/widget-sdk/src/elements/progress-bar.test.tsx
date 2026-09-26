import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBarElement } from "./progress-bar.js";
import { DEFAULT_RUNTIME, RuntimeContext } from "../runtime.js";
import type { ProgressBarNode } from "../definition.js";

const bar = (extra: Partial<ProgressBarNode> = {}): ProgressBarNode => ({
  id: "shipping",
  type: "progressBar",
  source: { type: "variable", name: "cart.total" },
  goal: 75,
  currency: "USD",
  messages: {
    incomplete: "You are {{remaining}} away from free shipping!",
    complete: "You have unlocked free shipping!",
  },
  ...extra,
});

function draw(
  node: ProgressBarNode,
  context: Record<string, string | number> = {},
) {
  return render(
    <RuntimeContext.Provider value={{ ...DEFAULT_RUNTIME, context }}>
      <ProgressBarElement node={node} />
    </RuntimeContext.Provider>,
  );
}

describe("progress towards a goal the host page reports", () => {
  // The sentence that makes this element worth having: the page knows the
  // cart, the document knows the offer, and neither one could say this alone.
  it("says how much further there is to go", () => {
    draw(bar(), { "cart.total": 50 });
    expect(
      screen.getByText("You are $25.00 away from free shipping!"),
    ).toBeInTheDocument();
  });

  it("says the other sentence once the goal is reached", () => {
    draw(bar(), { "cart.total": 80 });
    expect(
      screen.getByText("You have unlocked free shipping!"),
    ).toBeInTheDocument();
  });

  it("fills in proportion to the number it was given", () => {
    const { container } = draw(bar(), { "cart.total": 15 });
    const fill = container.querySelector("[role=progressbar] > div");
    expect(fill).toHaveStyle({ width: "20%" });
  });

  // Both, because neither is sufficient on its own: the bar has no words and
  // the sentence has no position.
  it("is a progress bar to a screen reader as well as a picture of one", () => {
    draw(bar(), { "cart.total": 50 });
    const drawn = screen.getByRole("progressbar");
    expect(drawn).toHaveAttribute("aria-valuenow", "50");
    expect(drawn).toHaveAttribute("aria-valuemax", "75");
    expect(drawn).toHaveAttribute(
      "aria-valuetext",
      "You are $25.00 away from free shipping!",
    );
  });

  // A page whose cart has not loaded yet is the ordinary first frame rather
  // than an error, and this element is on somebody else's page.
  it("draws an empty bar rather than failing when the page knows nothing yet", () => {
    const { container } = draw(bar());
    expect(container.querySelector("[role=progressbar] > div")).toHaveStyle({
      width: "0%",
    });
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  // A bar with no sentences is a legitimate widget: a thin line under a
  // heading, with the words above it written as their own text elements.
  it("draws the bar alone when the document wrote no sentences", () => {
    draw(bar({ messages: undefined }), { "cart.total": 50 });
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText(/free shipping/)).toBeNull();
  });

  // Plain numbers where no currency was named, because not every goal is
  // money: points to the next level, tasks to a badge.
  it("says a plain number when the goal is not money", () => {
    draw(
      bar({
        currency: undefined,
        messages: { incomplete: "{{remaining}} points to go" },
      }),
      {
        "cart.total": 50,
      },
    );
    expect(screen.getByText("25 points to go")).toBeInTheDocument();
  });

  // Never past the end, however much is in the cart.
  it("does not overfill", () => {
    const { container } = draw(bar(), { "cart.total": 500 });
    expect(container.querySelector("[role=progressbar] > div")).toHaveStyle({
      width: "100%",
    });
  });

  it("takes a fixed number straight from the document", () => {
    draw(bar({ source: { type: "number", value: 25 } }));
    expect(
      screen.getByText("You are $50.00 away from free shipping!"),
    ).toBeInTheDocument();
  });
});
