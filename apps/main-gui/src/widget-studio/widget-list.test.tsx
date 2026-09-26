import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
/* Starts i18next, so "Version {{version}}" is a sentence rather than a key. */
import "../language/i18n";
import { WidgetList } from "./widget-list";
import type { WidgetSummary } from "./widgets-api";

const ID = "w_0123456789abcdef0123456789abcdef";

const widget = (extra: Partial<WidgetSummary> = {}): WidgetSummary => ({
  WidgetId: ID,
  Name: "Black Friday banner",
  Version: 3,
  CreatedAt: "2026-01-01T00:00:00.000Z",
  UpdatedAt: "2026-02-01T00:00:00.000Z",
  ...extra,
});

function draw({
  widgets = [widget()],
  loading = false,
  error = null,
  selectedId = "",
  onChoose = vi.fn(),
}: Partial<Parameters<typeof WidgetList>[0]> = {}) {
  const result = render(
    <ThemeProvider theme={theme}>
      <WidgetList
        widgets={widgets}
        loading={loading}
        error={error}
        selectedId={selectedId}
        onChoose={onChoose}
      />
    </ThemeProvider>,
  );
  return { ...result, onChoose };
}

describe("the widgets on this account", () => {
  /* The id is the point of the table: it is random by design, so a widget whose
   * id has been lost can still be served forever and can never be found again.
   * In full, and not truncated -- an id with an ellipsis in the middle of it is
   * an id nobody can read out or check. */
  it("shows each id in full", () => {
    draw();
    expect(screen.getByText(ID)).toBeInTheDocument();
  });

  it("shows the name and which version is being served", () => {
    draw();
    expect(screen.getByText("Black Friday banner")).toBeInTheDocument();
    expect(screen.getByText("Version 3")).toBeInTheDocument();
  });

  it("copies an id when asked", () => {
    const writeText = vi.fn();
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Copy id" }));
    expect(writeText).toHaveBeenCalledWith(ID);
    vi.unstubAllGlobals();
  });

  /* The clipboard needs a permission and a secure context, and a copy that
   * quietly failed is not worth an error on a page whose id is already legible
   * on the screen. */
  it("does not fall over where there is no clipboard", () => {
    vi.stubGlobal("navigator", {});
    draw();
    expect(() =>
      fireEvent.click(screen.getByRole("button", { name: "Copy id" })),
    ).not.toThrow();
    vi.unstubAllGlobals();
  });

  it("hands the chosen widget back, so a save adds a version to it", () => {
    const { onChoose } = draw();
    fireEvent.click(screen.getByRole("button", { name: "Save over" }));
    expect(onChoose).toHaveBeenCalledWith(
      expect.objectContaining({ WidgetId: ID }),
    );
  });

  it("says which one is already chosen, and offers no second choosing of it", () => {
    draw({ selectedId: ID });
    expect(screen.getByRole("button", { name: "Selected" })).toBeDisabled();
  });

  /* An account with nothing gets a sentence about what to do rather than an
   * empty box. */
  it("says what to expect when there is nothing saved yet", () => {
    draw({ widgets: [] });
    expect(
      screen.getByText("Nothing saved yet. The first save mints an id."),
    ).toBeInTheDocument();
  });

  it("says so when the list could not be read", () => {
    draw({ error: "Your session has expired. Login again." });
    expect(
      screen.getByText("Your session has expired. Login again."),
    ).toBeInTheDocument();
  });

  it("draws placeholders while the list is on its way", () => {
    const { container } = draw({ loading: true, widgets: [] });
    expect(
      container.querySelectorAll(".MuiSkeleton-root").length,
    ).toBeGreaterThan(0);
  });
});
