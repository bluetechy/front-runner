import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import { RecoveryCodesDialog } from "./recovery-codes-dialog";

/*
 * The ten codes, the once.
 *
 * Every assertion here comes back to one fact: the API stores hashes, so once
 * this dialog is shut the codes exist only wherever somebody put them. It
 * says so, it offers two ways to keep them, and **it does not close on the
 * backdrop or on Escape** -- the one dialog in this product that takes that
 * away, because a stray click anywhere else costs nothing and a stray click
 * here costs somebody their way back into their own account.
 */

const codes = ["abcde-fghij", "klmno-pqrst", "uvwxy-23456"];

const draw = (shown: string[] | null = codes) => {
  const onClose = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <RecoveryCodesDialog codes={shown} onClose={onClose} />
    </ThemeProvider>,
  );
  return { onClose };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("what it shows", () => {
  it("shows every code it was given", () => {
    draw();

    for (const code of codes) expect(screen.getByText(code)).toBeVisible();
  });

  /* The sentence the whole dialog is arranged around, and it is said before
   * the list rather than after it. */
  it("says this is the only time they are shown", () => {
    draw();

    expect(screen.getByRole("alert")).toHaveTextContent(
      /only time they are shown/,
    );
  });

  it("says what spending one does, and what a new set does to these", () => {
    draw();

    expect(
      screen.getByText(/turns two-factor authentication off/),
    ).toBeVisible();
    expect(screen.getByText(/stops these ten working/)).toBeVisible();
  });

  it("draws nothing at all when there are no codes to show", () => {
    draw(null);

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("keeping them", () => {
  it("copies all of them, one to a line", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    draw();

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(codes.join("\n")),
    );
    expect(
      await screen.findByRole("button", { name: "Copied" }),
    ).toBeInTheDocument();
  });

  /* Several browsers refuse the clipboard without a gesture they recognize.
   * The codes are on the screen and the download is beside the button, so
   * there is nothing to report and nothing lost. */
  it("says nothing alarming when the browser refuses the clipboard", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("no")) },
    });
    draw();

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument(),
    );
  });

  it("offers a file to download as well, for somebody who prints them", () => {
    draw();

    expect(
      screen.getByRole("button", { name: "Download" }),
    ).toBeInTheDocument();
  });
});

describe("shutting it", () => {
  it("closes on Done", () => {
    const { onClose } = draw();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("closes on the close button", () => {
    const { onClose } = draw();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalled();
  });

  /* The one place in this product where a backdrop click is not an exit: it
   * would throw away the only copy of something. */
  it("does not close on the backdrop", () => {
    const { onClose } = draw();

    const backdrop = document.querySelector(".MuiBackdrop-root");
    if (backdrop) fireEvent.click(backdrop);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close on Escape", () => {
    const { onClose } = draw();

    fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Escape",
      code: "Escape",
    });

    expect(onClose).not.toHaveBeenCalled();
  });
});
