import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";

/*
 * The logo says one word, in one place, and the two surfaces that draw it
 * differ only in what they pass. This is what keeps that true: the word is
 * asserted here rather than in the header and the rail, and the mark is
 * optional rather than copied.
 *
 * `Link` is stubbed because a logo's target is a route, and standing a whole
 * router up to read one href would be testing TanStack.
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

const { Logo } = await import("./logo");

const renderIn = (element: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{element}</ThemeProvider>);

describe("the logo", () => {
  it("says the product's name", () => {
    renderIn(<Logo />);

    expect(screen.getByText("YourLogo")).toBeInTheDocument();
  });

  it("goes where it is told, and is not a link when it is told nowhere", () => {
    const { unmount } = renderIn(<Logo to="/dashboard" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/dashboard");
    unmount();

    renderIn(<Logo />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("draws the mark beside the word, unless asked not to", () => {
    const { container, unmount } = renderIn(<Logo />);
    expect(container.querySelector("svg")).not.toBeNull();
    unmount();

    const bare = renderIn(<Logo mark={false} />);
    expect(bare.container.querySelector("svg")).toBeNull();
    expect(screen.getByText("YourLogo")).toBeInTheDocument();
  });
});
