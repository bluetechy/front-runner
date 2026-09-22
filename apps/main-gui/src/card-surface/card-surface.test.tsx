import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { theme } from "../design-system";
import { CardLabel, CardSurface } from "./card-surface";

/*
 * The white paper everything behind the login is laid on. It was the
 * dashboard's card until the profile page wanted the same surface, which is
 * the rule in docs/codebase-structure.md being applied -- so what matters
 * here is that it is one surface with one set of rules, and that a caller can
 * add to it without replacing it.
 */

const renderIn = (element: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{element}</ThemeProvider>);

describe("a card", () => {
  it("shows what is put inside it", () => {
    renderIn(<CardSurface>Some content</CardSurface>);

    expect(screen.getByText("Some content")).toBeInTheDocument();
  });

  // The heading is a heading, not a styled line of text: the page behind the
  // login is read down its headings by anybody using one.
  it("writes its title as a heading", () => {
    renderIn(<CardSurface title="Contact">Some content</CardSurface>);

    expect(
      screen.getByRole("heading", { name: "Contact" }),
    ).toBeInTheDocument();
  });

  it("puts whatever the caller gives it opposite the title", () => {
    renderIn(
      <CardSurface title="Sales" action={<button>This month</button>}>
        Some content
      </CardSurface>,
    );

    expect(screen.getByRole("button", { name: "This month" })).toBeVisible();
  });

  // A card with neither is an ordinary panel, and the row that would hold
  // them is not drawn at all rather than drawn empty.
  it("draws no heading row when there is no title and no action", () => {
    renderIn(<CardSurface>Some content</CardSurface>);

    expect(screen.queryByRole("heading")).toBeNull();
  });

  // An action with no title still needs to sit on the right, so the empty
  // half of the row is held open rather than collapsed.
  it("keeps an action on the right when there is no title", () => {
    renderIn(
      <CardSurface action={<button>This month</button>}>Content</CardSurface>,
    );

    expect(screen.getByRole("button", { name: "This month" })).toBeVisible();
  });

  it("takes further styling without losing its own", () => {
    const { container } = renderIn(
      <CardSurface sx={{ marginTop: "2rem" }}>Content</CardSurface>,
    );
    const card = container.firstElementChild as HTMLElement;

    expect(card).toHaveStyle({ marginTop: "2rem" });
    expect(card).toHaveStyle({ borderRadius: "1.75rem" });
  });
});

describe("the label over a card and its sections", () => {
  it("is a heading, in the card's quieter ink", () => {
    renderIn(<CardLabel>Skills</CardLabel>);
    const label = screen.getByRole("heading", { name: "Skills" });

    expect(label).toHaveStyle({ textTransform: "uppercase" });
  });
});
