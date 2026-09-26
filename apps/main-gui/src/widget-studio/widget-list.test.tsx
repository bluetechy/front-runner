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
  DraftVersion: 3,
  PublishedVersion: 2,
  CreatedAt: "2026-01-01T00:00:00.000Z",
  UpdatedAt: "2026-02-01T00:00:00.000Z",
  ...extra,
});

function draw({
  widgets = [widget()],
  loading = false,
  error = null,
  selectedId = "",
  onOpen = vi.fn(),
}: Partial<Parameters<typeof WidgetList>[0]> = {}) {
  const result = render(
    <ThemeProvider theme={theme}>
      <WidgetList
        widgets={widgets}
        loading={loading}
        error={error}
        selectedId={selectedId}
        onOpen={onOpen}
      />
    </ThemeProvider>,
  );
  return { ...result, onOpen };
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

  /* Two marks rather than one number, because a widget being worked on is in
   * two states at once: a draft nobody is served, and a version everybody is.
   * The live version is named rather than implied, because "live" without a
   * number is what makes somebody publish a draft they meant to keep. */
  it("shows the name, the draft and what is live", () => {
    draw();
    expect(screen.getByText("Black Friday banner")).toBeInTheDocument();
    expect(screen.getByText("Draft 3")).toBeInTheDocument();
    expect(screen.getByText("Live 2")).toBeInTheDocument();
  });

  it("says plainly when a widget is on nobody's site", () => {
    draw({ widgets: [widget({ PublishedVersion: null })] });
    expect(screen.getByText("Not published")).toBeInTheDocument();
    expect(screen.queryByText(/^Live/)).toBeNull();
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

  /* Open, not "save over". Before a definition could be read back, taking the
   * id and leaving the box alone was the honest thing to offer; now the page
   * holds the document it is about to write over. */
  it("hands the widget back to be opened into the box", () => {
    const { onOpen } = draw();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ WidgetId: ID }),
    );
  });

  it("says which one is already in the box, and offers no second opening of it", () => {
    draw({ selectedId: ID });
    expect(screen.getByRole("button", { name: "In the box" })).toBeDisabled();
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
