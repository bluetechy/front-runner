import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Widget } from "./widget.js";

const ID = "w_0123456789abcdef0123456789abcdef";

const document = {
  widgetId: ID,
  version: 7,
  definition: {
    schemaVersion: "1.0" as const,
    canvas: { width: 600 },
    root: {
      id: "root",
      type: "container" as const,
      children: [{ id: "t", type: "text" as const, value: "BLACK FRIDAY" }],
    },
  },
};

function answer(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the component a customer mounts", () => {
  it("fetches the id and draws what came back", async () => {
    vi.stubGlobal("fetch", answer(document));
    render(<Widget endpoint="https://api.test" widgetId={ID} />);
    expect(await screen.findByText("BLACK FRIDAY")).toBeInTheDocument();
  });

  it("says which version it drew", async () => {
    vi.stubGlobal("fetch", answer(document));
    const onLoad = vi.fn();
    render(
      <Widget endpoint="https://api.test" widgetId={ID} onLoad={onLoad} />,
    );
    await waitFor(() =>
      expect(onLoad).toHaveBeenCalledWith(
        expect.objectContaining({ version: 7 }),
      ),
    );
  });

  /*
   * The default that matters most in this package. A widget that cannot load
   * is a decoration missing from a page that is otherwise working: showing a
   * shopper "403 Forbidden" where a banner was meant to be is worse than
   * showing them the page without the banner. The developer integrating it
   * hears about it through `onError`, which is who the reason is for.
   */
  it("draws nothing when it cannot load, and tells the developer why", async () => {
    vi.stubGlobal("fetch", answer(null, 403));
    const onError = vi.fn();
    const { container } = render(
      <Widget endpoint="https://api.test" widgetId={ID} onError={onError} />,
    );
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(onError.mock.calls[0]![0].status).toBe(403);
  });

  it("draws what the page asked for instead, when it asked for something", async () => {
    vi.stubGlobal("fetch", answer(null, 404));
    render(
      <Widget
        endpoint="https://api.test"
        widgetId={ID}
        error={(reason) => <p>{reason.message}</p>}
      />,
    );
    expect(
      await screen.findByText(/No widget with that id/),
    ).toBeInTheDocument();
  });

  it("draws the placeholder while the definition is on its way", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    render(
      <Widget
        endpoint="https://api.test"
        widgetId={ID}
        loading={<p>one moment</p>}
      />,
    );
    expect(screen.getByText("one moment")).toBeInTheDocument();
  });

  // Nothing by default, because a box reserved at the wrong size shifts the
  // customer's layout and a spinner that appears for 80ms is a flash.
  it("draws nothing at all while loading unless asked", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    const { container } = render(
      <Widget endpoint="https://api.test" widgetId={ID} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("passes the host page's context through to what it draws", async () => {
    vi.stubGlobal(
      "fetch",
      answer({
        ...document,
        definition: {
          ...document.definition,
          root: {
            id: "root",
            type: "container" as const,
            children: [
              { id: "t", type: "text" as const, value: "Hello {{name}}" },
            ],
          },
        },
      }),
    );
    render(
      <Widget
        endpoint="https://api.test"
        widgetId={ID}
        context={{ name: "Ana" }}
      />,
    );
    expect(await screen.findByText("Hello Ana")).toBeInTheDocument();
  });

  // A widget unmounted mid-flight must not resolve into a component nobody is
  // looking at, and React says so loudly when it does.
  it("abandons the request when it leaves the page", () => {
    const fetcher = vi.fn(
      (_url: string, init: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    const { unmount } = render(
      <Widget endpoint="https://api.test" widgetId={ID} />,
    );
    unmount();
    expect(fetcher.mock.calls[0]![1].signal!.aborted).toBe(true);
  });
});
