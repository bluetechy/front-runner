import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import { PlanCard } from "./plan-card";
import { audiences, money, type Plan } from "./plans";

/*
 * One plan, as white paper on the violet field.
 *
 * What a card has to get right is the price line: the same plan reads as one
 * figure billed monthly and another billed yearly, and the small print under
 * it has to say which of those the figure above is -- including for the free
 * plan and the one whose price is a conversation, which have no cadence at
 * all.
 *
 * `Link` is stubbed because the Enterprise button is a route, and standing a
 * whole router up to read one href would be testing TanStack.
 */

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...rest
  }: {
    children: React.ReactNode;
    to: string;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const plans = audiences.flatMap((audience) => audience.plans);
const planNamed = (name: string) =>
  plans.find((plan) => plan.name === name) as Plan;

const free = planNamed("Free");
const plus = planNamed("Plus");
const team = planNamed("Team");
const enterprise = planNamed("Enterprise");

const renderCard = (plan: Plan, billing: "monthly" | "annual" = "monthly") => {
  const onChoose = vi.fn();
  const view = render(
    <ThemeProvider theme={theme}>
      <PlanCard plan={plan} billing={billing} onChoose={onChoose} />
    </ThemeProvider>,
  );
  return { onChoose, ...view };
};

describe("what a card says", () => {
  it("names the plan, and says what it is for", () => {
    renderCard(plus);

    expect(screen.getByRole("heading", { name: plus.name })).toBeVisible();
    expect(screen.getByText(plus.tagline)).toBeInTheDocument();
  });

  it("lists everything in the plan", () => {
    renderCard(plus);

    for (const feature of plus.features)
      expect(screen.getByText(feature)).toBeInTheDocument();
  });

  // A plan that starts from another names it, so the list under it is what
  // this plan adds rather than eight lines repeated.
  it("says which plan it starts from, where there is one", () => {
    renderCard(plus);

    expect(screen.getByText("Everything in Free, plus:")).toBeInTheDocument();
  });

  it("says `Includes` where it starts from nothing", () => {
    renderCard(free);

    expect(screen.getByText("Includes:")).toBeInTheDocument();
  });
});

describe("the price on a card", () => {
  it("shows the monthly price when it is billed monthly", () => {
    renderCard(plus, "monthly");

    expect(screen.getByText("19")).toBeInTheDocument();
    expect(screen.getByText(/Billed monthly/)).toBeInTheDocument();
  });

  // The figure changes and the note under it says what the year costs, so
  // nobody reads the discounted month as the amount they will be charged.
  it("shows the discounted month, and the year's total, when billed yearly", () => {
    renderCard(plus, "annual");

    expect(screen.getByText("15.20")).toBeInTheDocument();
    expect(
      screen.getByText(`${money(182.4)} billed once a year`),
    ).toBeInTheDocument();
  });

  it("says a per-member price is per member, both times", () => {
    renderCard(team, "monthly");
    expect(screen.getByText("per member / month")).toBeInTheDocument();

    renderCard(team, "annual");
    expect(screen.getByText(/billed once a year, per member/)).toBeVisible();
  });

  // Free is free either way round, and saying "switch to yearly and save
  // 20%" of nothing would be nonsense.
  it("says a free plan is free rather than offering a discount on it", () => {
    renderCard(free, "annual");

    expect(screen.getByText(/Free forever/)).toBeInTheDocument();
    expect(screen.queryByText(/save 20%/)).toBeNull();
  });

  it("says the price is a conversation where there is no figure", () => {
    renderCard(enterprise, "monthly");

    expect(screen.getByText(/Let’s talk/)).toBeInTheDocument();
    expect(screen.getByText(/Priced on how many people/)).toBeInTheDocument();
  });
});

describe("the button on a card", () => {
  it("starts the plan where a plan can be started", () => {
    const { onChoose } = renderCard(plus);

    fireEvent.click(screen.getByRole("button", { name: plus.callToAction }));

    expect(onChoose).toHaveBeenCalledTimes(1);
  });

  // Enterprise is the one plan you cannot start on your own, so its button
  // goes somewhere rather than doing something.
  it("sends the plan you have to ask about to the contact page", () => {
    const { onChoose } = renderCard(enterprise);

    const link = screen.getByRole("link", {
      name: enterprise.callToAction,
    });

    expect(link).toHaveAttribute("href", "/contact-us");
    expect(onChoose).not.toHaveBeenCalled();
  });
});

describe("the plan drawn forward", () => {
  // Not a different card: the border is the same dark rule the others have,
  // and it is the ribbon and the lit button that carry it.
  it("wears a ribbon, and nothing else does", () => {
    renderCard(plus);
    expect(screen.getByText("Most popular")).toBeInTheDocument();

    renderCard(free);
    expect(screen.getAllByText("Most popular")).toHaveLength(1);
  });
});
