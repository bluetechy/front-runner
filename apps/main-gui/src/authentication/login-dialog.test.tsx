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

class RecoveryCodeError extends Error {}
const useRecoveryCode = vi.fn();

vi.mock("./recovery-code", () => ({ RecoveryCodeError, useRecoveryCode }));

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
  useRecoveryCode
    .mockReset()
    .mockResolvedValue({ TwoFactorRemoved: true, Remaining: 9 });
});

/* Get the card into the state where it is asking for a code, which is the
 * only way it ever asks: the provider refuses a login, and the card cannot
 * tell a wrong password from a missing code. */
const refused = async () => {
  login.mockRejectedValueOnce(new SignInError("No.", "invalid_grant"));
  fillIn();
  fireEvent.click(loginButton());
  await screen.findByLabelText("Verification code");
  login.mockReset().mockResolvedValue(undefined);
};

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
        /* No code: the card has not been refused yet, so it has not asked
         * for one, and sending an empty one would be sending one. */
        undefined,
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
  /* Keycloak answers a wrong password and a missing second-factor code
   * identically -- and on purpose, so that a login form cannot be asked which
   * accounts have two-factor authentication on. So this card cannot know
   * which happened, and says both rather than picking one. */
  it("says both of the things a refusal can mean, and lets it be tried again", async () => {
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
      /Check your email address and password.*two-factor authentication/,
    );
    expect(loginButton()).toBeEnabled();
  });

  /* A provider refusing for a reason of its own -- a disabled account, a
   * client that may not run this grant -- has already written the useful
   * sentence, and it is not about a code. */
  it("passes through a refusal the provider named itself", async () => {
    login.mockRejectedValue(
      new SignInError("Account is disabled.", "invalid_client"),
    );
    renderDialog();
    fillIn();

    fireEvent.click(loginButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Account is disabled.",
    );
  });

  // Anything that is not a SignInError is a bug rather than a refusal, and
  // its message is not written for somebody trying to sign in.
  it("says one honest sentence for anything it did not expect", async () => {
    login.mockRejectedValue(new TypeError("undefined is not a function"));
    renderDialog();
    fillIn();

    fireEvent.click(loginButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Login failed. Please try again.",
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

/*
 * The second factor, asked for in the same card.
 *
 * Keycloak answers a wrong password and a missing code identically -- and
 * deliberately, so a login form cannot be asked which accounts have
 * two-factor authentication on -- so the card cannot know which happened.
 * What it does instead is offer the box after any refusal and say both
 * things, which costs somebody with a wrong password one box they can ignore
 * and is the only thing that lets somebody with a factor login at all.
 */
describe("the code the second factor asks for", () => {
  it("is not asked for until something has been refused", () => {
    renderDialog();

    expect(screen.queryByLabelText("Verification code")).toBeNull();
  });

  it("is asked for after a refusal, whatever the refusal was", async () => {
    renderDialog();
    await refused();

    expect(screen.getByLabelText("Verification code")).toBeInTheDocument();
  });

  it("keeps what was typed, so only the code has to be added", async () => {
    renderDialog();
    await refused();

    expect(screen.getByLabelText("Email")).toHaveValue("member@example.test");
    expect(screen.getByLabelText("Password")).toHaveValue("a-password");
  });

  it("sends the code with the password rather than on its own", async () => {
    renderDialog();
    await refused();

    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "123456" },
    });
    fireEvent.click(loginButton());

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith(
        "member@example.test",
        "a-password",
        true,
        "123456",
      ),
    );
  });

  /* Six digits and nothing else. A code is typed from a screen in a hurry,
   * and the spaces and letters that come with that are not the person's
   * mistake to be told off for. */
  it("keeps only digits, and only six of them", async () => {
    renderDialog();
    await refused();

    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "12 34ab56789" },
    });

    expect(screen.getByLabelText("Verification code")).toHaveValue("123456");
  });

  /* The realm refuses a code that has already been spent, so the digits on
   * the screen are not new digits and pressing Login again is not a retry. */
  it("says to wait for the next code when one was refused", async () => {
    renderDialog();
    await refused();
    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "123456" },
    });
    login.mockRejectedValueOnce(new SignInError("No.", "invalid_grant"));

    fireEvent.click(loginButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Codes work once/,
    );
  });
});

/*
 * The way through for somebody whose authenticator app is gone.
 *
 * It does not login, and the card says so: spending a code takes the second
 * factor off the account, and the password login in front of them is what
 * does the rest. Somebody who is not told that walks away believing they are
 * still protected by something that is no longer there.
 */
describe("using a recovery code", () => {
  const recover = async () => {
    renderDialog();
    await refused();
    fireEvent.click(
      screen.getByRole("button", { name: /Use a recovery code/ }),
    );
  };

  it("is not offered until the card has asked for a code", () => {
    renderDialog();

    expect(screen.queryByRole("button", { name: /recovery code/ })).toBeNull();
  });

  it("asks for one code, beside the address and password already typed", async () => {
    await recover();

    expect(screen.getByLabelText("Recovery code")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("member@example.test");
  });

  it("spends it with the address and the password", async () => {
    await recover();
    fireEvent.change(screen.getByLabelText("Recovery code"), {
      target: { value: "abcde-fghij" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Use recovery code/ }));

    await waitFor(() =>
      expect(useRecoveryCode).toHaveBeenCalledWith(
        "member@example.test",
        "a-password",
        "abcde-fghij",
      ),
    );
  });

  /* The sentence this flow exists to say. It logs nobody in, and it leaves
   * the account with one less thing in front of it. */
  it("says the factor is off and that a login is still needed", async () => {
    await recover();
    fireEvent.change(screen.getByLabelText("Recovery code"), {
      target: { value: "abcde-fghij" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Use recovery code/ }));

    const said = await screen.findByRole("alert");
    expect(said).toHaveTextContent(/Two-factor authentication is now off/);
    expect(said).toHaveTextContent(/Login with your password/);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("says how many codes are left, so somebody knows to make more", async () => {
    useRecoveryCode.mockResolvedValue({ TwoFactorRemoved: true, Remaining: 1 });
    await recover();
    fireEvent.change(screen.getByLabelText("Recovery code"), {
      target: { value: "abcde-fghij" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Use recovery code/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /1 recovery code left/,
    );
  });

  it("goes back to the ordinary form, which is where the login happens", async () => {
    await recover();
    fireEvent.change(screen.getByLabelText("Recovery code"), {
      target: { value: "abcde-fghij" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Use recovery code/ }));

    await waitFor(() =>
      expect(screen.queryByLabelText("Recovery code")).toBeNull(),
    );
    expect(loginButton()).toBeInTheDocument();
  });

  it("shows what the API said when a code is refused", async () => {
    useRecoveryCode.mockRejectedValue(
      new RecoveryCodeError(
        "That email address, password and recovery code do not match an account.",
      ),
    );
    await recover();
    fireEvent.change(screen.getByLabelText("Recovery code"), {
      target: { value: "abcde-fghij" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Use recovery code/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /do not match an account/,
    );
  });

  it("can be backed out of", async () => {
    await recover();

    fireEvent.click(screen.getByRole("button", { name: /Back to the code/ }));

    expect(screen.queryByLabelText("Recovery code")).toBeNull();
    expect(screen.getByLabelText("Verification code")).toBeInTheDocument();
  });
});
