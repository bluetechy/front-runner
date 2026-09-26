import { ThemeProvider } from "@mui/material/styles";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import "../language/i18n";
import { WidgetPreview } from "./widget-preview";

/*
 * The preview draws with the runtime a customer embeds, so what the SDK does
 * with a definition is the SDK's own test. What is under test here is the
 * decision this component makes on every keystroke: whether what somebody has
 * typed can be handed to that runtime at all.
 *
 * That matters more than it sounds. A half-typed document goes through here on
 * its way to somebody else's component, and a renderer handed `{"canvas":` with
 * no root would throw inside the studio page.
 */

const banner = (value = "BLACK FRIDAY") =>
  JSON.stringify({
    schemaVersion: "1.0",
    canvas: { width: 600 },
    root: {
      id: "root",
      type: "container",
      children: [{ id: "t", type: "text", value }],
    },
  });

const draw = (definition: string, context?: Record<string, string | number>) =>
  render(
    <ThemeProvider theme={theme}>
      <WidgetPreview definition={definition} context={context} />
    </ThemeProvider>,
  );

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("drawing what is in the box", () => {
  it("draws the document once the typing settles", async () => {
    draw(banner());
    expect(await screen.findByText("BLACK FRIDAY")).toBeInTheDocument();
  });

  /* It is the widget, not a picture of one: the same component the SDK renders
   * once it has fetched a definition. */
  it("renders with the runtime a customer embeds", async () => {
    const { container } = draw(banner());
    await waitFor(() =>
      expect(container.querySelector("[data-widget-root]")).toBeInTheDocument(),
    );
  });

  /* The host page's context reaches the widget, which is what makes a progress
   * bar and a placeholder worth previewing at all. */
  it("passes the context through, so a placeholder says something", async () => {
    draw(banner("You are {{cart.total}} in"), { "cart.total": 75 });
    expect(await screen.findByText("You are 75 in")).toBeInTheDocument();
  });
});

describe("while somebody is still typing", () => {
  /* The preview would otherwise blink out at every unbalanced brace, which is
   * most of the time an edit is in progress. */
  it("keeps the last thing it could draw", async () => {
    const { rerender } = draw(banner());
    await screen.findByText("BLACK FRIDAY");

    rerender(
      <ThemeProvider theme={theme}>
        <WidgetPreview definition='{"schemaVersion":' />
      </ThemeProvider>,
    );

    await waitFor(() =>
      expect(
        screen.getByText("Still showing the last version that could be drawn."),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("BLACK FRIDAY")).toBeInTheDocument();
  });

  it("says plainly when there is nothing to draw yet", async () => {
    draw("");
    expect(await screen.findByText("Nothing to draw yet.")).toBeInTheDocument();
  });

  /*
   * The guard that keeps a half-typed document out of somebody else's
   * component. Each of these parses as JSON and is not a widget.
   */
  it("refuses to draw JSON that is not a widget document", async () => {
    for (const notAWidget of [
      '{"schemaVersion":"1.0"}',
      '{"canvas":{"width":600}}',
      '{"canvas":{"width":600},"root":{"id":"r","type":"text","value":"x"}}',
      "[]",
      "42",
    ]) {
      const { unmount } = draw(notAWidget);
      await waitFor(() =>
        expect(screen.getByText("Nothing to draw yet.")).toBeInTheDocument(),
      );
      unmount();
    }
  });
});

describe("what a preview must not do", () => {
  /*
   * A click in a preview goes nowhere. Without this, pressing a button in the
   * widget being edited would navigate away from the studio page, taking the
   * unsaved document with it.
   */
  it("does not navigate when a button in the widget is pressed", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });

    draw(
      JSON.stringify({
        schemaVersion: "1.0",
        canvas: { width: 600 },
        root: {
          id: "root",
          type: "container",
          children: [
            {
              id: "cta",
              type: "button",
              label: "SHOP NOW",
              action: { type: "navigate", url: "/sale" },
            },
          ],
        },
      }),
    );

    const button = await screen.findByRole("button", { name: "SHOP NOW" });
    button.click();
    expect(assign).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
