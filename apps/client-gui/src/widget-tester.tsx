import { useState } from "react";
import {
  Widget,
  isWidgetId,
  type WidgetFetchError,
} from "@front-runner/widget-sdk";

/*
 * Paste an id, press Render, see the widget.
 *
 * This is a stand-in for a customer's website, and it is written the way one
 * would be rather than the way this repository writes a page: no MUI, no
 * theme, no i18next, no router. That is the point of it. If rendering a widget
 * here needed anything from main-gui's toolchain, the SDK would not be an SDK
 * -- so this app imports React, the SDK, and nothing else, and what it proves
 * every time it draws something is that the runtime carries its own weight.
 *
 * It also runs on its own port, which makes it a genuine second origin: the
 * browser sends an `Origin` the API has to check against the widget's
 * `delivery.allowedOrigins`, so a missing entry is a 403 you see here instead
 * of in somebody's console. See vite.config.ts.
 *
 * The three things it shows about a render are the three that are hard to see
 * from inside main-gui: which version came back, what the API said when it
 * refused, and every event the widget reported.
 */

const DEFAULT_ENDPOINT =
  import.meta.env.VITE_WIDGET_API_URL ?? "http://localhost:30000";

/* Plain inline styles for the same reason the SDK uses them: this app has no
 * stylesheet, and anything it did define would be a thing a reader might
 * mistake for something the widget needs. */
const styles = {
  page: {
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
    maxWidth: "70rem",
    margin: "0 auto",
    padding: "2rem 1rem 4rem",
    color: "#111",
  },
  row: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap" as const,
    alignItems: "flex-end",
  },
  label: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.3rem",
    fontSize: "0.85rem",
  },
  input: {
    font: "inherit",
    padding: "0.5rem 0.6rem",
    border: "1px solid #bbb",
    borderRadius: 6,
    minWidth: "22rem",
  },
  button: {
    font: "inherit",
    fontWeight: 600,
    padding: "0.55rem 1.1rem",
    borderRadius: 6,
    border: "none",
    background: "#111",
    color: "#fff",
    cursor: "pointer",
  },
  stage: {
    marginTop: "1.5rem",
    padding: "1rem",
    border: "1px dashed #bbb",
    borderRadius: 10,
    /* A checkerboard, so a widget with a transparent background is visible as
     * having one rather than looking like it failed to load. */
    backgroundImage:
      "linear-gradient(45deg, #f4f4f4 25%, transparent 25%, transparent 75%, #f4f4f4 75%), linear-gradient(45deg, #f4f4f4 25%, transparent 25%, transparent 75%, #f4f4f4 75%)",
    backgroundSize: "20px 20px",
    backgroundPosition: "0 0, 10px 10px",
  },
  note: { fontSize: "0.85rem", color: "#555" },
  failure: {
    padding: "0.8rem 1rem",
    border: "1px solid #c62828",
    borderRadius: 8,
    background: "#fdecea",
    color: "#7f1d1d",
    fontSize: "0.9rem",
  },
  log: {
    margin: 0,
    padding: "0.75rem",
    background: "#111",
    color: "#eee",
    borderRadius: 8,
    fontSize: "0.78rem",
    whiteSpace: "pre-wrap" as const,
  },
} satisfies Record<string, React.CSSProperties>;

export function WidgetTester() {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [widgetId, setWidgetId] = useState("");
  /* What the widget being drawn is. Separate from the field, so editing the
   * field does not re-fetch on every keystroke: Render is the verb. */
  const [rendering, setRendering] = useState<{
    endpoint: string;
    widgetId: string;
  } | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  /* What the host page knows, which is what a widget's `{{placeholders}}` and
   * its progress bars read. A real shop would pass its cart total here; this
   * field is how that gets exercised without one. */
  const [cartTotal, setCartTotal] = useState("50");

  const malformed = widgetId.trim() !== "" && !isWidgetId(widgetId.trim());

  function render() {
    setVersion(null);
    setFailure(null);
    setEvents([]);
    setRendering({ endpoint: endpoint.trim(), widgetId: widgetId.trim() });
  }

  return (
    <main style={styles.page}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>
        Widget tester
      </h1>
      <p style={styles.note}>
        A page that is not main-gui, on an origin that is not main-gui&apos;s.
        Paste a widget id and press Render. The id has to be listed under{" "}
        <code>delivery.allowedOrigins</code> for{" "}
        <code>{window.location.origin}</code>, or the API will refuse it.
      </p>

      <div style={styles.row}>
        <label style={styles.label}>
          API
          <input
            style={styles.input}
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value)}
            aria-label="API"
          />
        </label>

        <label style={styles.label}>
          Widget id
          <input
            style={styles.input}
            value={widgetId}
            onChange={(event) => setWidgetId(event.target.value)}
            placeholder="w_..."
            aria-label="Widget id"
          />
        </label>

        <label style={styles.label}>
          cart.total
          <input
            style={{ ...styles.input, minWidth: "6rem" }}
            value={cartTotal}
            onChange={(event) => setCartTotal(event.target.value)}
            aria-label="cart.total"
          />
        </label>

        <button
          type="button"
          style={styles.button}
          onClick={render}
          disabled={!widgetId.trim() || malformed}
        >
          Render
        </button>
      </div>

      {/* Said here rather than waiting for a 404: the id's shape is something
       * this page can check, and a typo is the likeliest reason nothing
       * appears. */}
      {malformed ? (
        <p style={{ ...styles.note, color: "#c62828" }}>
          That is not a widget id. They look like <code>w_</code> and 32 hex
          characters.
        </p>
      ) : null}

      {version !== null ? (
        <p style={styles.note}>Serving version {version}.</p>
      ) : null}

      {failure ? (
        <p style={styles.failure} role="alert">
          {failure}
        </p>
      ) : null}

      <div style={styles.stage}>
        {rendering ? (
          <Widget
            endpoint={rendering.endpoint}
            widgetId={rendering.widgetId}
            context={{ "cart.total": cartTotal }}
            loading={<p style={styles.note}>Fetching…</p>}
            onLoad={(document) => setVersion(document.version)}
            /* The reason is shown on this page because this page is the
             * developer's. A real site would leave it out: a shopper seeing
             * "403 Forbidden" where a banner was meant to be is worse than a
             * shopper seeing the page without the banner. */
            onError={(reason: WidgetFetchError) =>
              setFailure(
                reason.status
                  ? `${reason.status}: ${reason.message}`
                  : reason.message,
              )
            }
            onEvent={(event) =>
              setEvents((seen) => [
                ...seen,
                `${new Date().toLocaleTimeString()}  ${event.action} on ${event.nodeId}${
                  event.name ? ` (${event.name})` : ""
                }`,
              ])
            }
          />
        ) : (
          <p style={styles.note}>Nothing rendered yet.</p>
        )}
      </div>

      {/* Every click the widget reported. Analytics is not built yet, and this
       * is the seam it will be built on: if an event does not appear here, it
       * will not appear in a customer's analytics either. */}
      <h2 style={{ fontSize: "1rem", marginTop: "1.5rem" }}>Events</h2>
      {events.length ? (
        <pre style={styles.log}>{events.join("\n")}</pre>
      ) : (
        <p style={styles.note}>
          Nothing yet. Clicking a button or a hotspot in the widget above lands
          here.
        </p>
      )}
    </main>
  );
}
