import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import { ConnectionDialog, type ConnectionRequest } from "./connection-dialog";
import type { SignInMethod } from "./sso-api";

/*
 * The dialog either side of a connection.
 *
 * What it is for is the sentences. Pressing Connect does not connect
 * anything: it hands the browser to the identity provider and the page goes
 * away, possibly through a login on the route. Somebody about to lose the page
 * they are on should be told so first, and told that their password still
 * works afterwards -- which is the thing this card is most often misread
 * about.
 */

const google: SignInMethod = {
  Alias: "google",
  Name: "Google",
  Available: true,
  Connected: false,
  ConnectedAs: null,
  CanDisconnect: false,
};

const open = (
  request: ConnectionRequest | null,
  busy = false,
): {
  onClose: ReturnType<typeof vi.fn>;
  onConfirm: ReturnType<typeof vi.fn>;
} => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <ConnectionDialog
        request={request}
        busy={busy}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    </ThemeProvider>,
  );
  return { onClose, onConfirm };
};

const connecting: ConnectionRequest = { method: google, action: "connect" };
const disconnecting: ConnectionRequest = {
  method: { ...google, Connected: true, CanDisconnect: true },
  action: "disconnect",
};

describe("before connecting one", () => {
  it("is headed for the provider it is about", () => {
    open(connecting);

    expect(
      screen.getByRole("heading", { name: "Connect Google" }),
    ).toBeInTheDocument();
  });

  it("says the page is about to go, and that a login may be asked for", () => {
    open(connecting);

    expect(
      screen.getByText(
        "This page will go to Google so you can prove the account there is yours. You may be asked to login here on the way.",
      ),
    ).toBeInTheDocument();
  });

  /* Connecting a provider is widely read as replacing the password. It does
   * not, and this is where that is said -- as "nothing else you login with",
   * which is the sentence that is true of an account that arrived through a
   * provider and may never have had a password at all. */
  it("says everything else keeps working, without promising a password", () => {
    open(connecting);

    expect(
      screen.getByText(
        "Nothing else you login with changes, and it all keeps working.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/your password/i)).not.toBeInTheDocument();
  });

  it("names the provider on the button that leaves", () => {
    const { onConfirm } = open(connecting);

    fireEvent.click(screen.getByRole("button", { name: "Continue to Google" }));

    expect(onConfirm).toHaveBeenCalledWith(connecting);
  });
});

describe("before disconnecting one", () => {
  it("says what stops working and what does not", () => {
    open(disconnecting);

    expect(
      screen.getByText("You will no longer be able to login with Google."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Nothing else you login with changes, and it all keeps working.",
      ),
    ).toBeInTheDocument();
  });

  // Reconnecting is the whole trip out to the provider rather than an undo,
  // which is worth knowing before rather than after.
  it("says what getting it back would take", () => {
    open(disconnecting);

    expect(
      screen.getByText(
        "Connecting it again means the same trip out to Google.",
      ),
    ).toBeInTheDocument();
  });

  it("names the provider on the button that does it", () => {
    const { onConfirm } = open(disconnecting);

    fireEvent.click(screen.getByRole("button", { name: "Disconnect Google" }));

    expect(onConfirm).toHaveBeenCalledWith(disconnecting);
  });
});

describe("getting out of it", () => {
  it("offers Cancel, which does nothing at all", () => {
    const { onClose, onConfirm } = open(connecting);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("offers the close button every dialog in this product has", () => {
    const { onClose } = open(connecting);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalled();
  });

  /* Held while something is in flight, the way the activity dialog is: a
   * second press would start a second trip. */
  it("holds every button while an answer is in flight", () => {
    open(connecting, true);

    for (const button of screen.getAllByRole("button"))
      expect(button).toBeDisabled();
  });
});

describe("with nothing to ask about", () => {
  it("is not there at all", () => {
    open(null);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
