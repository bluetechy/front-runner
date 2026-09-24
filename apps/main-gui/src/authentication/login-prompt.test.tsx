import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/*
 * The two cards that let somebody in, and one owner for both.
 *
 * Every way in is something the visitor clicked -- the header's "Login", its
 * "Sign Up", a pricing card's button -- and without a single owner they would
 * be dialogs that could both be on screen. That is the whole of what this
 * provider is for, so it is what is asserted: one card at a time, every
 * caller reaching the same one, and the link on each card swapping it for the
 * other rather than opening a second.
 *
 * Both dialogs are stubbed. What each of them does with what it is given is
 * its own test's business.
 */

vi.mock("./login-dialog", () => ({
  LoginDialog: ({
    open,
    onClose,
    onSignUp,
  }: {
    open: boolean;
    onClose: () => void;
    onSignUp: () => void;
  }) =>
    open ? (
      <dialog open aria-label="Login">
        The login card
        <button onClick={onClose}>Close it</button>
        <button onClick={onSignUp}>Don&rsquo;t have an Account ?</button>
      </dialog>
    ) : null,
}));

vi.mock("./sign-up-dialog", () => ({
  SignUpDialog: ({
    open,
    onClose,
    onLogin,
  }: {
    open: boolean;
    onClose: () => void;
    onLogin: () => void;
  }) =>
    open ? (
      <dialog open aria-label="Sign Up">
        The sign-up card
        <button onClick={onClose}>Close it</button>
        <button onClick={onLogin}>Already have an Account ?</button>
      </dialog>
    ) : null,
}));

const { LoginPromptProvider, useLoginPrompt } = await import("./login-prompt");

function Header() {
  const { open, signUp } = useLoginPrompt();
  return (
    <>
      <button onClick={open}>Login</button>
      <button onClick={signUp}>Sign Up</button>
    </>
  );
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

const showing = () =>
  screen
    .queryAllByRole("dialog")
    .map((card) => card.getAttribute("aria-label"));

describe("the prompt", () => {
  it("shows nothing until somebody asks for it", () => {
    renderApp();

    expect(showing()).toEqual([]);
    expect(screen.getByText("closed")).toBeInTheDocument();
  });

  it("opens the login card from the header", () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(showing()).toEqual(["Login"]);
  });

  it("opens the sign-up card from the header", () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(showing()).toEqual(["Sign Up"]);
  });

  it("opens the same login card from anywhere else", () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Get started" }));

    expect(showing()).toEqual(["Login"]);
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("closes again", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    fireEvent.click(screen.getByRole("button", { name: "Close it" }));

    expect(showing()).toEqual([]);
  });
});

/*
 * The two links that read "Don't have an Account?" and "Already have an
 * Account?". Swapping which card is showing, rather than a card opening a
 * card: "both at once" is not a state this provider can reach.
 */
describe("swapping one card for the other", () => {
  it("goes from the login card to the sign-up card", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    fireEvent.click(
      screen.getByRole("button", { name: /Don’t have an Account/ }),
    );

    expect(showing()).toEqual(["Sign Up"]);
  });

  it("goes back from the sign-up card to the login card", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    fireEvent.click(
      screen.getByRole("button", { name: /Already have an Account/ }),
    );

    expect(showing()).toEqual(["Login"]);
  });

  it("is still open, whichever of the two is showing", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(screen.getByText("open")).toBeInTheDocument();
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
