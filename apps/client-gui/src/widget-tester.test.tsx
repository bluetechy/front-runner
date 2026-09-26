import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WidgetTester } from "./widget-tester";

/*
 * The tester page. The network is stubbed, so what is under test is the page's
 * own behavior: that Render is the verb rather than every keystroke, that a
 * refusal is shown to the developer in full, and that the host page's context
 * reaches the widget.
 *
 * What it cannot test is the thing this app exists for -- a real browser
 * sending a real `Origin` to a real API. That is looked at by running it, and
 * apps/client-gui/README.md says how.
 */

const ID = "w_0123456789abcdef0123456789abcdef";

const answering = (body: unknown, status = 200) =>
  vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

const document = (value = "You are {{cart.total}} in") => ({
  widgetId: ID,
  version: 9,
  definition: {
    schemaVersion: "1.0",
    canvas: { width: 600 },
    root: {
      id: "root",
      type: "container",
      children: [{ id: "t", type: "text", value }],
    },
  },
});

const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const press = () =>
  fireEvent.click(screen.getByRole("button", { name: "Render" }));

beforeEach(() => {
  vi.stubGlobal("fetch", answering(document()));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("rendering a widget by its id", () => {
  it("fetches nothing until Render is pressed", () => {
    render(<WidgetTester />);
    fill("Widget id", ID);
    expect(fetch).not.toHaveBeenCalled();

    press();
    expect(fetch).toHaveBeenCalled();
  });

  it("draws what came back", async () => {
    render(<WidgetTester />);
    fill("Widget id", ID);
    press();
    expect(await screen.findByText(/You are/)).toBeInTheDocument();
  });

  /* The version is the fact that makes a stale cache visible: "the page is
   * showing 16 and you published 17". */
  it("says which version it is serving", async () => {
    render(<WidgetTester />);
    fill("Widget id", ID);
    press();
    expect(await screen.findByText("Serving version 9.")).toBeInTheDocument();
  });

  /* The context the host page supplies, which is what a widget's placeholders
   * and its progress bars read. A real shop would pass its cart; this field is
   * how that gets exercised without one. */
  it("passes the host page's cart total into the widget", async () => {
    render(<WidgetTester />);
    fill("Widget id", ID);
    fill("cart.total", "75");
    press();
    expect(await screen.findByText("You are 75 in")).toBeInTheDocument();
  });

  it("asks the endpoint in the field", async () => {
    render(<WidgetTester />);
    fill("API", "https://api.example.test");
    fill("Widget id", ID);
    press();
    await waitFor(() =>
      expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
        `https://api.example.test/widgets/${ID}`,
      ),
    );
  });
});

describe("when it cannot be rendered", () => {
  /*
   * In full, and on the page. This is the one app where that is right: it is
   * the developer's own page, and the 403 that means "this origin is not on the
   * widget's list" is the single most likely thing to be stuck on. A customer's
   * site shows the shopper nothing instead.
   */
  it("shows the status and the reason", async () => {
    vi.stubGlobal("fetch", answering(null, 403));
    render(<WidgetTester />);
    fill("Widget id", ID);
    press();

    const failure = await screen.findByRole("alert");
    expect(failure).toHaveTextContent("403");
    expect(failure).toHaveTextContent(/origin/i);
  });

  /* Said before anything is fetched: a typo is the likeliest reason nothing
   * appears, and the shape of an id is something this page can check itself. */
  it("refuses to render something that is not a widget id", () => {
    render(<WidgetTester />);
    fill("Widget id", "not-an-id");

    expect(screen.getByRole("button", { name: "Render" })).toBeDisabled();
    expect(screen.getByText(/not a widget id/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("has nothing to render before anybody asks", () => {
    render(<WidgetTester />);
    expect(screen.getByText("Nothing rendered yet.")).toBeInTheDocument();
  });
});

describe("what the widget reported", () => {
  /* Analytics is not built yet and this is the seam it will be built on: an
   * event that does not appear here will not appear in a customer's analytics
   * either. */
  it("logs a click on a button inside the widget", async () => {
    vi.stubGlobal(
      "fetch",
      answering({
        ...document(),
        definition: {
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
                action: { type: "trackEvent", name: "banner_click" },
              },
            ],
          },
        },
      }),
    );
    render(<WidgetTester />);
    fill("Widget id", ID);
    press();

    fireEvent.click(await screen.findByRole("button", { name: "SHOP NOW" }));
    expect(
      await screen.findByText(/trackEvent on cta \(banner_click\)/),
    ).toBeInTheDocument();
  });

  it("says so when nothing has happened yet", async () => {
    render(<WidgetTester />);
    expect(screen.getByText(/Nothing yet/)).toBeInTheDocument();
  });
});
