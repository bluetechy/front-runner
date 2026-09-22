import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import { audiences } from "./plans";

/*
 * The pricing page: who the plans are for, how often you pay, a row of cards,
 * and the questions people ask before they sign up.
 *
 * Signing up is signing in for the first time, so every plan but Enterprise
 * opens the same dialog the header does. The prompt is stubbed here, which is
 * what lets this assert that -- and `Link` is stubbed because two controls on
 * the page are routes.
 */

const open = vi.fn();

vi.mock("../authentication", () => ({
  useLoginPrompt: () => ({ open }),
}));

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

const { Pricing } = await import("./pricing");

const renderPage = () => {
  open.mockClear();
  return render(
    <ThemeProvider theme={theme}>
      <Pricing />
    </ThemeProvider>,
  );
};

const [individual, business] = audiences;

describe("who the plans are for", () => {
  it("opens on the individual plans", () => {
    renderPage();

    for (const plan of individual.plans)
      expect(
        screen.getByRole("heading", { name: plan.name }),
      ).toBeInTheDocument();
    expect(screen.getByText(individual.summary)).toBeInTheDocument();
  });

  it("shows the business plans instead when they are asked for", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: business.label }));

    for (const plan of business.plans)
      expect(
        screen.getByRole("heading", { name: plan.name }),
      ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: individual.plans[0]?.name }),
    ).toBeNull();
  });

  // An audience always has an answer, so pressing the one already chosen is
  // a no-op rather than an empty page.
  it("ignores the chosen audience being chosen again", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: individual.label }));

    expect(screen.getByText(individual.summary)).toBeInTheDocument();
  });
});

describe("how often you pay", () => {
  it("opens on the monthly price", () => {
    renderPage();

    expect(screen.getByText("19")).toBeInTheDocument();
  });

  it("shows the discounted price when a year is chosen", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Yearly/ }));

    expect(screen.getByText("15.20")).toBeInTheDocument();
  });

  it("says how much a year saves, on the control that chooses it", () => {
    renderPage();

    expect(screen.getByRole("button", { name: /save 20%/ })).toBeVisible();
  });
});

describe("starting a plan", () => {
  // Signing up is signing in for the first time, so it is the same dialog
  // the header opens rather than a second way in.
  it("opens the sign-in dialog for a plan you can start", () => {
    renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: individual.plans[0]!.callToAction }),
    );

    expect(open).toHaveBeenCalledTimes(1);
  });

  it("opens it from the band at the foot of the page as well", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Start free" }));

    expect(open).toHaveBeenCalledTimes(1);
  });

  // That plan is a conversation.
  it("sends Enterprise to the contact page instead", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: business.label }));

    expect(screen.getByRole("link", { name: "Contact sales" })).toHaveAttribute(
      "href",
      "/contact",
    );
  });
});

describe("the rest of the page", () => {
  it("ends on the questions and a band rather than on a shrug", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: /Questions, before you sign up/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Still deciding?" }),
    ).toBeInTheDocument();
  });
});
