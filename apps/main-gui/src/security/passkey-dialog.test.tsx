import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import type { Passkey } from "./passkey-api";
import { PasskeyDialog, type PasskeyRequest } from "./passkey-dialog";

/*
 * Adding a passkey, or taking one off.
 *
 * Three things are worth asserting, and all three are sentences rather than
 * buttons.
 *
 * Adding one warns that the page is about to go away and that the device is
 * about to ask for something, because a browser dialog nobody was expecting
 * is a browser dialog people dismiss.
 *
 * Adding one says the key stays on the device that made it, which is the
 * fact people are most often surprised by and the reason a passkey made on a
 * work laptop is no use on a phone.
 *
 * Removing one says what still works. A security page that takes a
 * credential off without saying what is left is a page people stop pressing
 * buttons on, and the true sentence here is reassuring: nobody is locked out
 * by losing a passkey.
 */

const laptop: Passkey = {
  Id: "credential-laptop",
  Label: "MacBook Touch ID",
  CreatedAt: "2026-09-01T10:00:00.000Z",
};

const draw = (request: PasskeyRequest | null, busy = false) => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <PasskeyDialog
        request={request}
        busy={busy}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    </ThemeProvider>,
  );
  return { onClose, onConfirm };
};

describe("being asked before the page goes away", () => {
  it("says the page is leaving and what the device will ask for", () => {
    draw({ passkey: null, action: "add" });

    expect(screen.getByText(/go to our identity provider/)).toBeInTheDocument();
    expect(screen.getByText(/face, your fingerprint/)).toBeInTheDocument();
  });

  /* The sentence this dialog exists for. Somebody who believes a passkey
   * follows their account will add one on a laptop and be locked out of the
   * shortcut on their phone without knowing why. */
  it("says the key stays on this device, and to add one on the phone too", () => {
    draw({ passkey: null, action: "add" });

    expect(screen.getByText(/never sent to us/)).toBeInTheDocument();
    expect(screen.getByText(/add one there too/)).toBeInTheDocument();
  });

  it("says that adding one replaces nothing", () => {
    draw({ passkey: null, action: "add" });

    expect(screen.getByText(/Adding one replaces nothing/)).toBeInTheDocument();
  });

  it("continues on the button rather than on opening", () => {
    const { onConfirm } = draw({ passkey: null, action: "add" });

    fireEvent.click(
      screen.getByRole("button", { name: "Continue to your device" }),
    );

    expect(onConfirm).toHaveBeenCalledWith({ passkey: null, action: "add" });
  });
});

describe("being asked before one comes off", () => {
  it("names the passkey it is about", () => {
    draw({ passkey: laptop, action: "remove" });

    expect(
      screen.getByText(/"MacBook Touch ID" will stop being able to login/),
    ).toBeInTheDocument();
  });

  it("falls back to a plain noun where there is no name to use", () => {
    draw({ passkey: { ...laptop, Label: null }, action: "remove" });

    expect(
      screen.getByText(/This passkey will stop being able to login/),
    ).toBeInTheDocument();
  });

  /* The assertion this block exists for. Nobody is locked out by losing a
   * passkey, and a dialog that let somebody think otherwise would keep them
   * from removing one they no longer trust. */
  it("says what still works, so nobody reads this as being locked out", () => {
    draw({ passkey: laptop, action: "remove" });

    expect(screen.getByText(/does not lock you out/)).toBeInTheDocument();
  });

  it("says it can be added again, and what that costs", () => {
    draw({ passkey: laptop, action: "remove" });

    expect(screen.getByText(/the same trip out/)).toBeInTheDocument();
  });

  it("removes on the button rather than on opening", () => {
    const { onConfirm } = draw({ passkey: laptop, action: "remove" });

    fireEvent.click(screen.getByRole("button", { name: "Remove it" }));

    expect(onConfirm).toHaveBeenCalledWith({
      passkey: laptop,
      action: "remove",
    });
  });
});

describe("the dialog itself", () => {
  it("is shut when there is nothing being asked about", () => {
    draw(null);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on Cancel without doing anything", () => {
    const { onClose, onConfirm } = draw({ passkey: laptop, action: "remove" });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  /* An answer is in flight and the page may be about to go away. A second
   * press would start a second trip. */
  it("takes no further answer while one is in flight", () => {
    draw({ passkey: laptop, action: "remove" }, true);

    expect(screen.getByRole("button", { name: "Remove it" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
