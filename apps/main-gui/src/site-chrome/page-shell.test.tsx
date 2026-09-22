import { ThemeProvider } from "@mui/material/styles";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";

/*
 * The violet field and header every marketing route is rendered inside.
 *
 * It is a shell and nothing more: the page goes in a `main`, the header sits
 * above it, and the prompt that opens the sign-in dialog wraps both -- so a
 * control anywhere on a marketing page can open it without the page knowing
 * how.
 */

vi.mock("./site-header", () => ({
  SiteHeader: () => <header>The site header</header>,
}));

vi.mock("../authentication", () => ({
  LoginPromptProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="login-prompt">{children}</div>
  ),
}));

const { PageShell } = await import("./page-shell");

const renderShell = () =>
  render(
    <ThemeProvider theme={theme}>
      <PageShell>
        <p>The page</p>
      </PageShell>
    </ThemeProvider>,
  );

describe("the shell around a marketing page", () => {
  it("draws the header above whatever page it was given", () => {
    renderShell();

    expect(screen.getByText("The site header")).toBeInTheDocument();
    expect(screen.getByText("The page")).toBeInTheDocument();
  });

  it("puts the page in a main, so it is the page rather than the chrome", () => {
    renderShell();

    expect(
      within(screen.getByRole("main")).getByText("The page"),
    ).toBeInTheDocument();
  });

  // The prompt wraps the header as well as the page: the header's own Login
  // button opens the same dialog a pricing card does.
  it("holds the sign-in prompt around both", () => {
    renderShell();
    const prompt = screen.getByTestId("login-prompt");

    expect(within(prompt).getByText("The site header")).toBeInTheDocument();
    expect(within(prompt).getByText("The page")).toBeInTheDocument();
  });

  // The field is painted here rather than on the body, because the pages
  // behind the login are painted by their own shell.
  it("paints the field it all sits on", () => {
    const { container } = renderShell();
    const field = container.querySelector('[data-testid="login-prompt"] > div');

    expect(field).toHaveStyle({ minHeight: "100dvh" });
  });
});
