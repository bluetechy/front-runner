import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/*
 * The three cards that deal with getting in, and one owner for all of them.
 *
 * Every way in is something the visitor clicked -- the header's "Login", its
 * "Sign Up", a pricing card's button -- and without a single owner they would
 * be dialogs that could all be on screen at once. That is the whole of what
 * this provider is for, so it is what is asserted: one card at a time, every
 * caller reaching the same one, and the links between them swapping which is
 * showing rather than opening a second.
 *
 * All three dialogs are stubbed. What each of them does with what it is given
 * is its own test's business.
 */

vi.mock("./login-dialog", () => ({
  LoginDialog: ({
    open,
    onClose,
    onSignUp,
    onForgotPassword,
  }: {
    open: boolean;
    onClose: () => void;
    onSignUp: () => void;
    onForgotPassword: () => void;
  }) =>
    open ? (
      <dialog open aria-label="Login">
        The login card
        <button onClick={onClose}>Close it</button>
        <button onClick={onSignUp}>Don&rsquo;t have an Account ?</button>
        <button onClick={onForgotPassword}>Forgot Password</button>
      </dialog>
    ) : null,
}));

vi.mock("./forgot-password-dialog", () => ({
  ForgotPasswordDialog: ({
    open,
    onClose,
    onLogin,
  }: {
    open: boolean;
    onClose: () => void;
    onLogin: () => void;
  }) =>
    open ? (
      <dialog open aria-label="Forgot Password">
        The forgot-password card
        <button onClick={onClose}>Close it</button>
        <button onClick={onLogin}>Back to Login</button>
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
  const { open, signUp, forgotPassword } = useLoginPrompt();
  return (
    <>
      <button onClick={open}>Login</button>
      <button onClick={signUp}>Sign Up</button>
      <button onClick={forgotPassword}>Reset it</button>
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

  it("opens the forgot-password card from anywhere that asks", () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Reset it" }));

    expect(showing()).toEqual(["Forgot Password"]);
  });

  it("closes again", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    fireEvent.click(screen.getByRole("button", { name: "Close it" }));

    expect(showing()).toEqual([]);
  });
});

/*
 * The links that read "Don't have an Account?", "Already have an Account?",
 * "Forgot Password" and "Back to Login". Swapping which card is showing,
 * rather than a card opening a card: "two at once" is not a state this
 * provider can reach.
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

  it("goes from the login card to the forgot-password card", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    fireEvent.click(screen.getByRole("button", { name: "Forgot Password" }));

    expect(showing()).toEqual(["Forgot Password"]);
  });

  it("goes back from the forgot-password card to the login card", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Reset it" }));

    fireEvent.click(screen.getByRole("button", { name: "Back to Login" }));

    expect(showing()).toEqual(["Login"]);
  });

  it("is still open, whichever of the three is showing", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Reset it" }));

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
