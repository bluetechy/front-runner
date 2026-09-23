import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import { Toast, type Notice } from "./toast";

/*
 * What a page says back when something it was asked to do has finished.
 *
 * The thing worth pinning here is that the tone is never the whole message:
 * each one carries Material's icon for its severity as well as its color,
 * and the sentence reads the same in gray. Nothing in this product is said in
 * color alone -- see docs/style-guide.md.
 */

const renderIn = (element: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{element}</ThemeProvider>);

const notice = (
  tone: Notice["tone"],
  message = "Profile updated.",
): Notice => ({
  message,
  tone,
});

describe("saying nothing", () => {
  it("shows nothing at all until there is something to say", () => {
    renderIn(<Toast notice={null} onClose={vi.fn()} />);

    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("saying something", () => {
  it("says what happened", () => {
    renderIn(<Toast notice={notice("success")} onClose={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Profile updated.");
  });

  it.each([
    ["it was done", "success"] as const,
    ["it was not", "error"] as const,
    ["nobody asked", "info"] as const,
  ])("draws an icon as well as a color when %s", (_case, tone) => {
    const { container } = renderIn(
      <Toast notice={notice(tone)} onClose={vi.fn()} />,
    );

    expect(container.querySelector(".MuiAlert-icon svg")).not.toBeNull();
  });

  // Teal when it saved, pink when it did not. The two are the same weight on
  // purpose -- both carry white at the same ratio -- so the icon above is
  // what separates them for anybody who cannot tell the hues apart.
  it("is teal when it worked and pink when it did not", () => {
    const { container: saved } = renderIn(
      <Toast notice={notice("success")} onClose={vi.fn()} />,
    );
    const { container: refused } = renderIn(
      <Toast notice={notice("error")} onClose={vi.fn()} />,
    );

    expect(saved.querySelector(".MuiAlert-root")).toHaveStyle({
      backgroundColor: theme.palette.brand.toastSuccess,
    });
    expect(refused.querySelector(".MuiAlert-root")).toHaveStyle({
      backgroundColor: theme.palette.brand.toastFailure,
    });
  });

  // Material's `info` is a blue this product does not own, so the tone that
  // is neither a success nor a failure is the panel's own violet.
  it("says something nobody asked about in the panel's violet", () => {
    const { container } = renderIn(
      <Toast notice={notice("info")} onClose={vi.fn()} />,
    );

    expect(container.querySelector(".MuiAlert-root")).toHaveStyle({
      backgroundColor: theme.palette.brand.panel,
    });
  });

  it("can be dismissed before it goes on its own", () => {
    const onClose = vi.fn();
    renderIn(<Toast notice={notice("success")} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(onClose).toHaveBeenCalled();
  });

  // Clear of the rail down the left, and of the button that was just pressed.
  it("lands in the bottom right corner", () => {
    const { container } = renderIn(
      <Toast notice={notice("success")} onClose={vi.fn()} />,
    );

    expect(
      container.querySelector(".MuiSnackbar-anchorOriginBottomRight"),
    ).not.toBeNull();
  });
});
