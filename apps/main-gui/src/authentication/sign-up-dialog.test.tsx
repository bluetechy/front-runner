import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";

/*
 * The sign-up card.
 *
 * Making the account and signing in with it are two acts, in that order, and
 * most of this file is about the seam between them. The one that matters most
 * is what the card says when the account was made and the sign-in after it
 * failed: "could not create your account" would send somebody to make a
 * second one, which the realm would refuse.
 *
 * main-api, Keycloak, the session and the router are all stubbed. What is
 * under test is the card's own behavior.
 */

const registerAccount = vi.fn();
const login = vi.fn();
const navigate = vi.fn();
const startRedirect = vi.fn();

class RegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistrationError";
  }
}

vi.mock("./registration", () => ({ RegistrationError, registerAccount }));

vi.mock("./keycloak", () => ({ startRedirect }));

vi.mock("./session", () => ({ useSession: () => ({ login }) }));

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));

const { SignUpDialog } = await import("./sign-up-dialog");

const renderDialog = () => {
  const onClose = vi.fn();
  const onLogin = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <SignUpDialog open onClose={onClose} onLogin={onLogin} />
    </ThemeProvider>,
  );
  return { onClose, onLogin };
};

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const fillIn = (changes: Record<string, string> = {}) => {
  const filled: Record<string, string> = {
    "First name": "Marcus",
    "Last name": "Wright",
    Username: "marcus",
    Email: "marcus@example.test",
    Password: "a-good-enough-password",
    "Confirm password": "a-good-enough-password",
    ...changes,
  };
  for (const [label, value] of Object.entries(filled)) type(label, value);
};

const signUpButton = () =>
  screen
    .getAllByRole("button", { name: /Sign Up$/ })
    .find((button) => button.getAttribute("type") === "submit") as HTMLElement;

beforeEach(() => {
  registerAccount.mockReset().mockResolvedValue({
    Username: "marcus",
    Email: "marcus@example.test",
  });
  login.mockReset().mockResolvedValue(undefined);
  navigate.mockReset().mockResolvedValue(undefined);
  startRedirect.mockReset().mockResolvedValue(undefined);
});

describe("what the card asks for", () => {
  // The six Keycloak's own registration page asks for: the realm does not use
  // the address as the username, so both are given.
  it.each([
    "First name",
    "Last name",
    "Username",
    "Email",
    "Password",
    "Confirm password",
  ])("asks for %s", (label) => {
    renderDialog();

    expect(screen.getByLabelText(label)).toBeInTheDocument();
  });

  it("offers a way back to the login card", () => {
    const { onLogin } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(onLogin).toHaveBeenCalledTimes(1);
  });
});

describe("making an account", () => {
  it("sends what was filled in", async () => {
    renderDialog();
    fillIn();

    fireEvent.click(signUpButton());

    await waitFor(() =>
      expect(registerAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          Username: "marcus",
          Email: "marcus@example.test",
          FirstName: "Marcus",
          LastName: "Wright",
          Password: "a-good-enough-password",
        }),
      ),
    );
  });

  // Straight in with the password they just chose, and remembered: somebody
  // who has just made an account expects to still be in it tomorrow.
  it("signs in with the address it was given back, and lands on the dashboard", async () => {
    const { onClose } = renderDialog();
    fillIn();

    fireEvent.click(signUpButton());

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith(
        "marcus@example.test",
        "a-good-enough-password",
        true,
      ),
    );
    expect(onClose).toHaveBeenCalled();
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: "/dashboard" }),
    );
  });

  it("says so while it is working", async () => {
    let finish = () => undefined as void;
    registerAccount.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = () => resolve();
      }),
    );
    renderDialog();
    fillIn();

    fireEvent.click(signUpButton());

    expect(await screen.findByText("Creating your account")).toBeVisible();
    finish();
  });
});

describe("what it refuses to send", () => {
  it("checks every box before asking the API for anything", async () => {
    renderDialog();
    fillIn({ Username: "me", Email: "not-an-address" });

    fireEvent.click(signUpButton());

    expect(await screen.findByText(/at least 3 characters/)).toBeVisible();
    expect(screen.getByText(/like you@example\.com/)).toBeVisible();
    expect(registerAccount).not.toHaveBeenCalled();
  });

  it("refuses two passwords that do not match", async () => {
    renderDialog();
    fillIn({ "Confirm password": "something-else-entirely" });

    fireEvent.click(signUpButton());

    expect(await screen.findByText(/do not match/)).toBeVisible();
    expect(registerAccount).not.toHaveBeenCalled();
  });

  // The sentence goes as soon as the box is being fixed, rather than waiting
  // for the next submit to say it is gone.
  it("takes back what it said about a box once it is being typed in", async () => {
    renderDialog();
    fillIn({ Username: "me" });
    fireEvent.click(signUpButton());
    await screen.findByText(/at least 3 characters/);

    type("Username", "marcus");

    expect(screen.queryByText(/at least 3 characters/)).toBeNull();
  });
});

describe("when it does not work", () => {
  it("shows what the API said", async () => {
    registerAccount.mockRejectedValue(
      new RegistrationError("That username or email address is already taken"),
    );
    renderDialog();
    fillIn();

    fireEvent.click(signUpButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("already taken");
  });

  // The account exists; only the sign-in after it failed. Telling somebody it
  // could not be created would send them to make a second one.
  it("says the account was made when it is the sign-in that failed", async () => {
    login.mockRejectedValue(new Error("Invalid user credentials"));
    renderDialog();
    fillIn();

    fireEvent.click(signUpButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your account was created, but signing in failed",
    );
  });

  it("lets somebody try again after a failure", async () => {
    registerAccount.mockRejectedValueOnce(new RegistrationError("taken"));
    renderDialog();
    fillIn();
    fireEvent.click(signUpButton());
    await screen.findByRole("alert");

    fillIn({ Username: "marcus2" });
    fireEvent.click(signUpButton());

    await waitFor(() => expect(registerAccount).toHaveBeenCalledTimes(2));
  });
});

describe("signing up with a provider", () => {
  // The same redirect as signing in with one: Keycloak makes the account the
  // first time it is offered an identity it does not know.
  it.each([
    ["Sign Up With Google", "google"],
    ["Sign Up With Facebook", "facebook"],
    ["Sign Up With Apple ID", "apple"],
  ])("hands the browser over for %s", (label, alias) => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: label }));

    expect(startRedirect).toHaveBeenCalledWith({
      kind: "login",
      idpHint: alias,
    });
    expect(registerAccount).not.toHaveBeenCalled();
  });

  it("says so when the identity provider cannot be reached", async () => {
    startRedirect.mockRejectedValue(new Error("Failed to fetch"));
    renderDialog();

    fireEvent.click(
      screen.getByRole("button", { name: "Sign Up With Google" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not reach the identity provider.",
    );
  });
});
