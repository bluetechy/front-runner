import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";

/*
 * The shell every page behind the login is rendered inside.
 *
 * It owns one piece of state and nothing else: whether the rail is open. On a
 * narrow window the rail is a drawer the top bar's hamburger opens, so the
 * button is in one component and the drawer in another and this is what joins
 * them.
 */

vi.mock("./app-sidebar", () => ({
  AppSidebar: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    <nav>
      {open ? "The rail is open" : "The rail is shut"}
      <button onClick={onClose}>Close the rail</button>
    </nav>
  ),
}));

vi.mock("./app-top-bar", () => ({
  AppTopBar: ({ onOpenNav }: { onOpenNav: () => void }) => (
    <header>
      <button onClick={onOpenNav}>Open the rail</button>
    </header>
  ),
}));

const { AppShell } = await import("./app-shell");

const renderShell = () =>
  render(
    <ThemeProvider theme={theme}>
      <AppShell>
        <p>The page</p>
      </AppShell>
    </ThemeProvider>,
  );

describe("the shell around a page behind the login", () => {
  it("draws the rail, the bar and the page", () => {
    renderShell();

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("The page")).toBeInTheDocument();
  });

  it("puts the page in a main, so it is the page rather than the chrome", () => {
    renderShell();

    expect(
      within(screen.getByRole("main")).getByText("The page"),
    ).toBeInTheDocument();
  });
});

describe("the rail on a narrow window", () => {
  it("starts shut", () => {
    renderShell();

    expect(screen.getByText("The rail is shut")).toBeInTheDocument();
  });

  // The button is in the bar and the drawer is in the rail; this is the only
  // thing that knows about both.
  it("opens when the bar's hamburger is pressed", () => {
    renderShell();

    fireEvent.click(screen.getByRole("button", { name: "Open the rail" }));

    expect(screen.getByText("The rail is open")).toBeInTheDocument();
  });

  it("shuts again when the rail asks to be shut", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Open the rail" }));

    fireEvent.click(screen.getByRole("button", { name: "Close the rail" }));

    expect(screen.getByText("The rail is shut")).toBeInTheDocument();
  });
});
