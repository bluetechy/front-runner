import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";

/*
 * The page a reset link lands on.
 *
 * Two things carry this file. Nothing happens on arrival: unlike
 * /verify-email, the token is spent when a password is submitted, so merely
 * opening the page (or a mail client prefetching the link) resets nothing.
 * And when the link is spent, the page says what to login as rather than
 * leaving somebody on a page with no way on.
 *
 * main-api and the prompt are stubbed. What is under test is the page.
 */

const resetPassword = vi.fn();
const open = vi.fn();

class PasswordResetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordResetError";
  }
}

vi.mock("./password-reset", () => ({ PasswordResetError, resetPassword }));

vi.mock("./login-prompt", () => ({ useLoginPrompt: () => ({ open }) }));

const { ResetPassword } = await import("./reset-password");

const TOKEN = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

const renderWith = (token: string | undefined) =>
  render(
    <ThemeProvider theme={theme}>
      <ResetPassword token={token} />
    </ThemeProvider>,
  );

const renderPage = () => renderWith(TOKEN);

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const fillIn = (password = "Trombone-42-Fig", confirm = password) => {
  type("New password", password);
  type("Confirm password", confirm);
};

const setPassword = () =>
  fireEvent.click(screen.getByRole("button", { name: "Set Password" }));

beforeEach(() => {
  resetPassword.mockReset().mockResolvedValue("marcus");
  open.mockReset();
});

describe("arriving", () => {
  it("asks for the new password twice", () => {
    renderPage();

    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
  });

  // The token is spent when the form is submitted, not when the page is
  // opened: a mail client that follows links to preview them would otherwise
  // burn the link before anybody read the message.
  it("spends nothing until a password is submitted", () => {
    renderPage();

    expect(resetPassword).not.toHaveBeenCalled();
  });

  // A link somebody typed out by hand, or one a mail client mangled.
  it("says so when the URL carries no token, and offers no form", () => {
    renderWith(undefined);

    expect(screen.getByText(/missing its token/)).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).toBeNull();
  });
});

describe("choosing a password", () => {
  it("sends the token from the URL and the password that was typed", async () => {
    renderPage();
    fillIn();

    setPassword();

    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith(TOKEN, "Trombone-42-Fig"),
    );
  });

  it("says what to login as once the password is set", async () => {
    renderPage();
    fillIn();

    setPassword();

    expect(await screen.findByText(/login as marcus/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Password changed" }),
    ).toBeInTheDocument();
  });

  // The page is on the marketing shell, which owns the login card.
  it("offers the login card at the end", async () => {
    renderPage();
    fillIn();
    setPassword();
    await screen.findByText(/login as marcus/);

    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(open).toHaveBeenCalledTimes(1);
  });

  it("does not leave the form behind once the link is spent", async () => {
    renderPage();
    fillIn();

    setPassword();

    await screen.findByText(/login as marcus/);
    expect(screen.queryByLabelText("New password")).toBeNull();
  });
});

describe("what it refuses to send", () => {
  it.each([
    [
      "a password too short to be one",
      ["short", "short"],
      "A password needs at least 12 characters",
    ],
    [
      "two passwords that do not match",
      ["Trombone-42-Fig", "Trombone-42-Fog"],
      "The two passwords do not match",
    ],
  ])("refuses %s", (_name, [password, confirm], sentence) => {
    renderPage();
    fillIn(password, confirm);

    setPassword();

    expect(screen.getByText(sentence!)).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("clears a sentence as soon as its box is being fixed", () => {
    renderPage();
    fillIn("short");
    setPassword();

    type("New password", "Trombone-42-Fig");

    expect(
      screen.queryByText("A password needs at least 12 characters"),
    ).toBeNull();
  });
});

describe("when it does not work", () => {
  // The link is spent whatever happens next, so the way back is a new link
  // rather than this form again.
  it("shows what the API said about a link that has been used", async () => {
    resetPassword.mockRejectedValue(
      new PasswordResetError(
        "That password reset link is not valid or has already been used.",
      ),
    );
    renderPage();
    fillIn();

    setPassword();

    expect(await screen.findByText(/already been used/)).toBeInTheDocument();
  });

  it("says something honest about a failure it does not recognize", async () => {
    resetPassword.mockRejectedValue(new Error("boom"));
    renderPage();
    fillIn();

    setPassword();

    expect(await screen.findByText(/could not be set/)).toBeInTheDocument();
  });
});
