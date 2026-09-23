import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import { PlanCard } from "./plan-card";
import {
  audiences,
  CONTACT_BUTTON,
  money,
  START_BUTTON,
  type Plan,
} from "./plans";

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

const basic = planNamed("Basic");
const standard = planNamed("Standard");
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
    renderCard(standard);

    expect(screen.getByRole("heading", { name: standard.name })).toBeVisible();
    expect(screen.getByText(standard.tagline)).toBeInTheDocument();
  });

  it("lists everything in the plan", () => {
    renderCard(standard);

    for (const feature of standard.features)
      expect(screen.getByText(feature)).toBeInTheDocument();
  });

  // A plan that starts from another names it, so the list under it is what
  // this plan adds rather than eight lines repeated.
  it("says which plan it starts from, where there is one", () => {
    renderCard(standard);

    expect(screen.getByText("Everything in Basic, plus:")).toBeInTheDocument();
  });

  it("says `Includes` where it starts from nothing", () => {
    renderCard(basic);

    expect(screen.getByText("Includes:")).toBeInTheDocument();
  });
});

describe("the price on a card", () => {
  it("shows the monthly price when it is billed monthly", () => {
    renderCard(standard, "monthly");

    expect(screen.getByText("19")).toBeInTheDocument();
    expect(screen.getByText(/Billed monthly/)).toBeInTheDocument();
  });

  // The figure changes and the note under it says what the year costs, so
  // nobody reads the discounted month as the amount they will be charged.
  it("shows the discounted month, and the year's total, when billed yearly", () => {
    renderCard(standard, "annual");

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

  // Basic is free either way round, and saying "switch to yearly and save
  // 20%" of nothing would be nonsense.
  it("says a free plan is free rather than offering a discount on it", () => {
    renderCard(basic, "annual");

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
    const { onChoose, container } = renderCard(standard);

    fireEvent.click(
      within(container).getByRole("button", { name: START_BUTTON }),
    );

    expect(onChoose).toHaveBeenCalledTimes(1);
  });

  // Enterprise is the one plan you cannot start on your own, so its button
  // goes somewhere rather than doing something.
  it("sends the plan you have to ask about to the contact page", () => {
    const { onChoose } = renderCard(enterprise);

    const link = screen.getByRole("link", {
      name: CONTACT_BUTTON,
    });

    expect(link).toHaveAttribute("href", "/contact-us");
    expect(onChoose).not.toHaveBeenCalled();
  });
});

describe("the plan drawn forward", () => {
  // Not a different card: it sits on the same line as the others and takes
  // the same rule round the outside. The badge beside its name is what says
  // so in words, and only one card in a row may wear one.
  it("wears the badge, and nothing else does", () => {
    renderCard(standard);
    expect(screen.getByText("Most popular")).toBeInTheDocument();

    renderCard(basic);
    expect(screen.getAllByText("Most popular")).toHaveLength(1);
  });

  // The button is not what says which plan is being pushed: every card wears
  // the same lit one, so the paper and the badge are carrying it alone. Each
  // has to be read inside its own card, since the words are the same on both.
  it("wears the same lit button as every other card", () => {
    const { container: drawnForward } = renderCard(standard);
    const { container: plain } = renderCard(basic);

    expect(
      within(drawnForward).getByRole("button", { name: START_BUTTON }),
    ).toHaveClass("MuiButton-contained");
    expect(
      within(plain).getByRole("button", { name: START_BUTTON }),
    ).toHaveClass("MuiButton-contained");
  });
});
