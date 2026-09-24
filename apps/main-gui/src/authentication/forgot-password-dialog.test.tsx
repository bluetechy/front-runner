import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";

/*
 * The forgot-password card.
 *
 * The assertion this file exists for is the one about what the card says
 * afterwards: the same sentence whatever it was given, because the API
 * answers a name that matches an account exactly as it answers one that does
 * not. A card that said "no such account" would be the easiest way in the
 * product to find out who has one.
 *
 * main-api is stubbed. What is under test is the card's own behavior.
 */

const requestPasswordReset = vi.fn();

class PasswordResetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordResetError";
  }
}

vi.mock("./password-reset", () => ({
  PasswordResetError,
  requestPasswordReset,
}));

const { ForgotPasswordDialog } = await import("./forgot-password-dialog");

const renderDialog = () => {
  const onClose = vi.fn();
  const onLogin = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <ForgotPasswordDialog open onClose={onClose} onLogin={onLogin} />
    </ThemeProvider>,
  );
  return { onClose, onLogin };
};

const type = (value: string) =>
  fireEvent.change(screen.getByLabelText("Username or email address"), {
    target: { value },
  });

const send = () =>
  fireEvent.click(screen.getByRole("button", { name: "Send Reset Link" }));

beforeEach(() => {
  requestPasswordReset.mockReset().mockResolvedValue(undefined);
});

describe("what the card asks for", () => {
  // Keycloak accepts either at a login prompt, and somebody who has forgotten
  // a password should not also have to remember which they are known by.
  it("asks for a username or an email address, in one box", () => {
    renderDialog();

    expect(
      screen.getByLabelText("Username or email address"),
    ).toBeInTheDocument();
  });

  it("offers a way back to the login card", () => {
    const { onLogin } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Back to Login" }));

    expect(onLogin).toHaveBeenCalledTimes(1);
  });
});

describe("asking for a link", () => {
  it("sends what was typed", async () => {
    renderDialog();
    type("marcus");

    send();

    await waitFor(() =>
      expect(requestPasswordReset).toHaveBeenCalledWith("marcus"),
    );
  });

  it("says nothing was typed rather than asking for nothing", () => {
    renderDialog();

    send();

    expect(
      screen.getByText("Enter your username or email address"),
    ).toBeInTheDocument();
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it("clears that sentence as soon as the box is being filled", () => {
    renderDialog();
    send();

    type("m");

    expect(
      screen.queryByText("Enter your username or email address"),
    ).toBeNull();
  });

  // The whole point of this file.
  it("will not say whether the name matched an account", async () => {
    renderDialog();
    type("nobody");

    send();

    expect(
      await screen.findByText(/If nobody belongs to an account/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Username or email address")).toBeNull();
  });

  it("says how long the link lasts", async () => {
    renderDialog();
    type("marcus");

    send();

    expect(
      await screen.findByText(/stops working after an hour/),
    ).toBeInTheDocument();
  });

  it("stays open on the answer, because the answer is the whole outcome", async () => {
    const { onClose } = renderDialog();
    type("marcus");

    send();

    await screen.findByText(/If marcus belongs to an account/);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("when it does not work", () => {
  // A failure here is this application's, not an answer about the account.
  it("shows what went wrong and leaves the box to try again", async () => {
    requestPasswordReset.mockRejectedValue(
      new PasswordResetError("Could not reach the server. Please try again."),
    );
    renderDialog();
    type("marcus");

    send();

    expect(
      await screen.findByText("Could not reach the server. Please try again."),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Username or email address"),
    ).toBeInTheDocument();
  });

  it("says something honest about a failure it does not recognize", async () => {
    requestPasswordReset.mockRejectedValue(new Error("boom"));
    renderDialog();
    type("marcus");

    send();

    expect(
      await screen.findByText(/Could not ask for a reset link/),
    ).toBeInTheDocument();
  });
});
