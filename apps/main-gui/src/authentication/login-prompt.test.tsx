import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/*
 * One sign-in dialog for the whole app, opened from anywhere.
 *
 * Every way in is something the visitor clicked -- the header's "Login", a
 * pricing card's button -- and without a single owner they would be two
 * dialogs that could both be on screen. That is the whole of what this
 * provider is for, so it is what is asserted: one dialog, and every caller
 * opening the same one.
 */

vi.mock("./login-dialog", () => ({
  LoginDialog: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <dialog open>
        The dialog
        <button onClick={onClose}>Close it</button>
      </dialog>
    ) : null,
}));

const { LoginPromptProvider, useLoginPrompt } = await import("./login-prompt");

function Header() {
  const { open } = useLoginPrompt();
  return <button onClick={open}>Login</button>;
}

function PricingCard() {
  const { open, isOpen } = useLoginPrompt();
  return (
    <>
      <button onClick={open}>Get started</button>
      <p>{isOpen ? "open" : "closed"}</p>
    </>
  );
}

const renderApp = () =>
  render(
    <LoginPromptProvider>
      <Header />
      <PricingCard />
    </LoginPromptProvider>,
  );

describe("the sign-in prompt", () => {
  it("shows nothing until somebody asks for it", () => {
    renderApp();

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("closed")).toBeInTheDocument();
  });

  it("opens from the header", () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  // The same dialog, not a second one: signing up is signing in for the
  // first time.
  it("opens the same one from anywhere else", () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Get started" }));

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("closes again", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    fireEvent.click(screen.getByRole("button", { name: "Close it" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("asking for the prompt outside the provider", () => {
  // A control that thinks it can open the dialog and silently cannot is
  // worse than one that fails where it is written.
  it("throws rather than doing nothing", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<Header />)).toThrow(/outside a <LoginPromptProvider>/);
  });
});
