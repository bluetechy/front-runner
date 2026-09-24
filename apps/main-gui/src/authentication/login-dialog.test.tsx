import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";

/*
 * The sign-in dialog.
 *
 * Only the email-and-password form completes here. The three providers are
 * flows Keycloak hosts, so those leave the page and come back to
 * /auth/callback; the test for each of them is that the browser was handed
 * over with the right intent and that nothing was signed in locally. "Sign Up"
 * and "Forgot Password" are neither: they ask for the other two cards, and the
 * provider owning all three swaps them in.
 *
 * Keycloak, the session and the router are all stubbed. What is under test is
 * the dialog's own behavior: what it does while a sign-in is in flight, what
 * it says when one fails, and where it goes when one works.
 */

const login = vi.fn();
const navigate = vi.fn();
const startRedirect = vi.fn();

class SignInError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "SignInError";
  }
}

vi.mock("./identity-provider", () => ({ SignInError, startRedirect }));

vi.mock("./session", () => ({ useSession: () => ({ login }) }));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

const { LoginDialog } = await import("./login-dialog");

const renderDialog = () => {
  const onClose = vi.fn();
  const onSignUp = vi.fn();
  const onForgotPassword = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <LoginDialog
        open
        onClose={onClose}
        onSignUp={onSignUp}
        onForgotPassword={onForgotPassword}
      />
    </ThemeProvider>,
  );
  return { onClose, onSignUp, onForgotPassword };
};

/*
 * Two controls submit this form and both are called "Login": the button at
 * the foot of the card, and the mock-up's arrow inside the password field.
 * They do the same thing on purpose, so they are told apart here by which is
 * which rather than by position.
 */
const loginButton = () =>
  screen
    .getAllByRole("button", { name: "Login" })
    .find((button) => button.textContent === "Login") as HTMLElement;

const loginArrow = () =>
  screen
    .getAllByRole("button", { name: "Login" })
    .find(
      (button) => button.getAttribute("aria-label") === "Login",
    ) as HTMLElement;

const fillIn = (email = "member@example.test", password = "a-password") => {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
};

beforeEach(() => {
  login.mockReset().mockResolvedValue(undefined);
  navigate.mockReset().mockResolvedValue(undefined);
  startRedirect.mockReset().mockResolvedValue(undefined);
});

describe("what the card offers", () => {
  it("asks for an email and a password", () => {
    renderDialog();

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("offers the three providers Keycloak hosts", () => {
    renderDialog();

    for (const label of [
      "Login With Google",
      "Login With Facebook",
      "Login With Apple ID",
    ])
      expect(screen.getByRole("button", { name: label })).toBeVisible();
  });

  // The third card, rather than Keycloak's reset-credentials page: it asks
  // for the link, main-api sends it, and our own /reset-password takes it
  // from there.
  it("asks for the forgot-password card rather than leaving the site", () => {
    const { onForgotPassword } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Forgot Password" }));

    expect(onForgotPassword).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("link", { name: "Forgot Password" })).toBeNull();
  });

  // A password kept past the browser closing is the usual expectation, and
  // the checkbox is what decides which store the refresh token goes to.
  it("offers to remember the session, and does by default", () => {
    renderDialog();

    expect(screen.getByRole("checkbox", { name: "Remember me" })).toBeChecked();
  });
});

describe("signing in", () => {
  it("signs in with what was typed, and remembers by default", async () => {
    renderDialog();
    fillIn();

    fireEvent.click(loginButton());

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith(
        "member@example.test",
        "a-password",
        true,
      ),
    );
  });

  // Somebody typing an address on a phone gets a trailing space from the
  // keyboard as often as not.
  it("trims the address before sending it", async () => {
    renderDialog();
    fillIn("  member@example.test  ");

    fireEvent.click(loginButton());

    await waitFor(() =>
      expect(login.mock.calls[0]?.[0]).toBe("member@example.test"),
    );
  });

  it("keeps the session to this tab when the box is cleared", async () => {
    renderDialog();
    fillIn();

    fireEvent.click(screen.getByRole("checkbox", { name: "Remember me" }));
    fireEvent.click(loginButton());

    await waitFor(() => expect(login.mock.calls[0]?.[2]).toBe(false));
  });

  it("closes the dialog and goes to the dashboard once it works", async () => {
    const { onClose } = renderDialog();
    fillIn();

    fireEvent.click(loginButton());

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith({ to: "/dashboard" });
  });

  // The mock-up's arrow inside the password field. It is the same submit.
  it("signs in from the arrow in the password field as well", async () => {
    renderDialog();
    fillIn();

    fireEvent.click(loginArrow());

    await waitFor(() => expect(login).toHaveBeenCalled());
  });
});

describe("while a sign-in is in flight", () => {
  it("says so, and cannot be pressed again", async () => {
    login.mockReturnValue(new Promise(() => undefined));
    renderDialog();
    fillIn();

    fireEvent.click(loginButton());

    const button = await screen.findByRole("button", { name: /Signing in/ });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(login).toHaveBeenCalledTimes(1);
  });

  // Closing mid-flight would leave a sign-in completing against a dialog
  // nobody is looking at.
  it("cannot be closed", async () => {
    login.mockReturnValue(new Promise(() => undefined));
    const { onClose } = renderDialog();
    fillIn();

    fireEvent.click(loginButton());
    await screen.findByRole("button", { name: /Signing in/ });

    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("when a sign-in fails", () => {
  it("shows what Keycloak said, and lets it be tried again", async () => {
    login.mockRejectedValue(
      new SignInError(
        "That email and password do not match an account.",
        "invalid_grant",
      ),
    );
    renderDialog();
    fillIn();

    fireEvent.click(loginButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That email and password do not match an account.",
    );
    expect(loginButton()).toBeEnabled();
  });

  // Anything that is not a SignInError is a bug rather than a refusal, and
  // its message is not written for somebody trying to sign in.
  it("says one honest sentence for anything it did not expect", async () => {
    login.mockRejectedValue(new TypeError("undefined is not a function"));
    renderDialog();
    fillIn();

    fireEvent.click(loginButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sign-in failed. Please try again.",
    );
  });

  it("clears the last failure when another attempt starts", async () => {
    login.mockRejectedValueOnce(new SignInError("No.", "invalid_grant"));
    renderDialog();
    fillIn();
    fireEvent.click(loginButton());
    await screen.findByRole("alert");

    login.mockReturnValue(new Promise(() => undefined));
    fireEvent.click(loginButton());

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});

describe("the flows Keycloak hosts", () => {
  it.each([
    ["Login With Google", "google"],
    ["Login With Facebook", "facebook"],
    ["Login With Apple ID", "apple"],
  ])("hands the browser over for %s", (label, alias) => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: label }));

    expect(startRedirect).toHaveBeenCalledWith({
      kind: "login",
      idpHint: alias,
    });
    expect(login).not.toHaveBeenCalled();
  });

  it("asks for the sign-up card rather than leaving the site", () => {
    const { onSignUp } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(onSignUp).toHaveBeenCalledTimes(1);
    expect(startRedirect).not.toHaveBeenCalled();
  });

  it("says so when the identity provider cannot be reached", async () => {
    startRedirect.mockRejectedValue(new Error("Failed to fetch"));
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Login With Google" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not reach the identity provider.",
    );
  });
});
