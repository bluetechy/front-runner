import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import { SmsDialog } from "./sms-dialog";

/*
 * Attaching a phone number, in two steps.
 *
 * What is worth asserting is the seam between them. The first step sends a
 * code to a number somebody typed, which is not yet a number they own; the
 * second is the only one that turns anything on. The dialog is told which step
 * it is on by one thing only -- whether the caller is holding a number the API
 * says it texted -- and the whole of this file leans on that.
 *
 * The other thing here is the number read back. Somebody who mistyped a digit
 * finds out from those last four digits rather than from a message that never
 * arrives, which is also why "Use a different number" is a way back rather
 * than a way out.
 */

const draw = ({
  open = true,
  busy = false,
  error = null as string | null,
  sentTo = null as string | null,
} = {}) => {
  const handlers = {
    onClose: vi.fn(),
    onBack: vi.fn(),
    onSend: vi.fn(),
    onConfirm: vi.fn(),
  };
  render(
    <ThemeProvider theme={theme}>
      <SmsDialog
        open={open}
        busy={busy}
        error={error}
        sentTo={sentTo}
        {...handlers}
      />
    </ThemeProvider>,
  );
  return handlers;
};

const type = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("the first step: the number", () => {
  it("asks for a number with its country code", () => {
    draw();

    expect(screen.getByLabelText(/Phone number/)).toBeInTheDocument();
    expect(screen.getByText(/country code/)).toBeVisible();
  });

  /* Said where the choice is made rather than after it. An authenticator app
   * is the better factor and this is the moment somebody is picking. */
  it("says plainly that SMS is the weaker choice", () => {
    draw();

    expect(screen.getByText(/weaker choice/)).toBeVisible();
    expect(screen.getByText(/moved to somebody else's handset/)).toBeVisible();
  });

  it("sends the number that was typed", () => {
    const { onSend } = draw();

    type(/Phone number/, "  +1 555 555 0123  ");
    fireEvent.click(screen.getByRole("button", { name: "Send the code" }));

    expect(onSend).toHaveBeenCalledWith("+1 555 555 0123");
  });

  it("will not send an empty box", () => {
    draw();

    expect(
      screen.getByRole("button", { name: "Send the code" }),
    ).toBeDisabled();
  });

  it("does not ask for a code before one has been sent", () => {
    draw();

    expect(screen.queryByLabelText(/^Code$/)).toBeNull();
  });
});

describe("the second step: the code", () => {
  const sent = { sentTo: "•••• 0123" };

  /* The one thing that tells the two steps apart. */
  it("switches to the code box once the API says a message went", () => {
    draw(sent);

    expect(screen.getByLabelText(/^Code$/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Phone number/)).toBeNull();
  });

  it("reads the number back, so a mistyped digit is caught here", () => {
    draw(sent);

    expect(screen.getByText(/0123/)).toBeVisible();
  });

  it("says the account holds no number until the code comes back", () => {
    draw(sent);

    expect(
      screen.getByText(/keeps no number until you type it back/),
    ).toBeVisible();
  });

  it("confirms with the six digits", () => {
    const { onConfirm } = draw(sent);

    type(/^Code$/, "483920");
    fireEvent.click(screen.getByRole("button", { name: "Turn it on" }));

    expect(onConfirm).toHaveBeenCalledWith("483920");
  });

  /* Text rather than a number input, so a code beginning with a zero survives
   * being typed. */
  it("keeps a leading zero", () => {
    const { onConfirm } = draw(sent);

    type(/^Code$/, "048392");
    fireEvent.click(screen.getByRole("button", { name: "Turn it on" }));

    expect(onConfirm).toHaveBeenCalledWith("048392");
  });

  it("takes digits only, and no more than six", () => {
    draw(sent);

    type(/^Code$/, "48a39201");

    expect(screen.getByLabelText(/^Code$/)).toHaveValue("483920");
  });

  it("will not confirm a half-typed code", () => {
    draw(sent);

    type(/^Code$/, "4839");

    expect(screen.getByRole("button", { name: "Turn it on" })).toBeDisabled();
  });

  /* A way back rather than a way out: somebody who does not recognize the
   * last four digits wants this step again, not the dialog shut. */
  it("goes back to the number without closing", () => {
    const { onBack, onClose } = draw(sent);

    fireEvent.click(
      screen.getByRole("button", { name: "Use a different number" }),
    );

    expect(onBack).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("when something goes wrong", () => {
  it("says it beside the box rather than anywhere else", () => {
    draw({ error: "That code could not be sent to that number." });

    expect(screen.getByRole("alert")).toHaveTextContent(/could not be sent/);
  });
});

describe("while something is in flight", () => {
  it("holds both buttons", () => {
    draw({ busy: true });

    for (const name of ["Cancel", "Send the code"])
      expect(screen.getByRole("button", { name })).toBeDisabled();
  });
});
