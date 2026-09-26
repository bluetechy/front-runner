import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import type { TwoFactorMethod } from "./two-factor-api";
import { TwoFactorDialog, type TwoFactorRequest } from "./two-factor-dialog";

/*
 * Turning a second factor on, or taking one off.
 *
 * What is worth asserting is what it says before somebody presses the button,
 * because both directions have a consequence nobody would guess from the
 * label. Turning it on takes the page away and needs the phone in hand at the
 * other end. Turning it off leaves the account standing on its password
 * alone, which is the sentence a security page owes somebody.
 */

const method: TwoFactorMethod = {
  Kind: "authenticator-app",
  Name: "Authenticator app",
  Available: true,
  Configured: false,
  ConfiguredAt: null,
  Label: null,
  Recommended: true,
};

const draw = (
  request: TwoFactorRequest | null,
  { busy = false, hasRecoveryCodes = true } = {},
) => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <TwoFactorDialog
        request={request}
        busy={busy}
        hasRecoveryCodes={hasRecoveryCodes}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    </ThemeProvider>,
  );
  return { onClose, onConfirm };
};

describe("before turning one on", () => {
  const request: TwoFactorRequest = { method, action: "enable" };

  /* The button does not turn anything on: it hands the browser to the
   * provider, and the page it was pressed from is gone until that is over. */
  it("says the page is about to go to the provider", () => {
    draw(request);

    expect(screen.getByText(/will go to our identity provider/)).toBeVisible();
  });

  // The QR code is shown once. Somebody who left the phone upstairs should
  // find that out here rather than there.
  it("says to have the app ready, because the code is shown once", () => {
    draw(request);

    expect(screen.getByText(/shown once/)).toBeVisible();
  });

  it("says what logging in will ask for afterwards", () => {
    draw(request);

    expect(screen.getByText(/six digits/)).toBeVisible();
  });

  /* An account with a factor and no recovery codes is one lost phone away
   * from being locked out for good, and this is the last moment to say so. */
  it("says to make recovery codes when the account has none", () => {
    draw(request, { hasRecoveryCodes: false });

    expect(screen.getByText(/Make a set of recovery codes/)).toBeVisible();
  });

  it("leaves that out for an account that already has some", () => {
    draw(request, { hasRecoveryCodes: true });

    expect(screen.queryByText(/Make a set of recovery codes/)).toBeNull();
  });

  it("hands the request back when it is confirmed", () => {
    const { onConfirm } = draw(request);

    fireEvent.click(screen.getByRole("button", { name: /Continue to setup/ }));

    expect(onConfirm).toHaveBeenCalledWith(request);
  });
});

describe("before turning one off", () => {
  const request: TwoFactorRequest = {
    method: { ...method, Configured: true },
    action: "disable",
  };

  /* The sentence this dialog exists for. Everything else is convenience. */
  it("says the account will be left on its password alone", () => {
    draw(request);

    expect(screen.getByText(/password alone/)).toBeVisible();
  });

  it("says turning it on again means the same trip", () => {
    draw(request);

    expect(screen.getByText(/same trip/)).toBeVisible();
  });

  it("hands the request back when it is confirmed", () => {
    const { onConfirm } = draw(request);

    fireEvent.click(screen.getByRole("button", { name: /Turn it off/ }));

    expect(onConfirm).toHaveBeenCalledWith(request);
  });
});

describe("while an answer is in flight", () => {
  it("holds both buttons and the close", () => {
    draw({ method, action: "enable" }, { busy: true });

    for (const name of [/Continue to setup/, /Cancel/, /Close/])
      expect(screen.getByRole("button", { name })).toBeDisabled();
  });
});

describe("with nothing to ask about", () => {
  it("draws nothing at all", () => {
    draw(null);

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
