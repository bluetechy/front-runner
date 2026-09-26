import { useEffect, useRef, useState } from "react";
import { WidgetView } from "./widget-view.js";
import { fetchWidget, WidgetFetchError } from "./widget-client.js";
import type { ReactNode } from "react";
import type { WidgetDocument } from "./definition.js";
import type { WidgetViewProps } from "./widget-view.js";

/*
 * The component a customer mounts: an id in, a widget on the page.
 *
 * ```jsx
 * <Widget
 *   endpoint="https://api.frontrunner.example"
 *   widgetId="w_8f2c..."
 *   context={{ "cart.total": 50 }}
 * />
 * ```
 *
 * It fetches, then renders `<WidgetView>`. The split is deliberate: everything
 * about *drawing* is in that component and testable without a network, and
 * everything about *getting* is here.
 *
 * `useState` and `useEffect` rather than TanStack Query, which main-gui would
 * reach for. This package cannot: a customer's application has its own data
 * layer, and an SDK that dragged a second copy of Query into their bundle and
 * demanded a `QueryClientProvider` above our component would be an SDK their
 * reviewer rejects. React itself is the only peer dependency, and there is no
 * ordinary one at all.
 */

export interface WidgetProps extends Omit<WidgetViewProps, "definition"> {
  /* The base address of the API. No path: the path is this package's. */
  endpoint: string;
  widgetId: string;
  /* Drawn while the definition is on its way. Nothing by default, which is the
   * right default on somebody else's page: a spinner that appears for 80ms is
   * a flash, and a box reserved at the wrong size shifts their layout. */
  loading?: ReactNode;
  /*
   * Drawn when the widget cannot be fetched, and handed the reason.
   *
   * Nothing by default, and that is the important default in this file. A
   * widget that cannot load is a decoration missing from a page that is
   * otherwise working: showing a customer's shopper "Error: 403 Forbidden"
   * where a banner was meant to be is worse than showing them the page without
   * the banner. The developer integrating it sees the reason through
   * `onError`, which is the person the reason is for.
   */
  error?: (reason: WidgetFetchError) => ReactNode;
  onError?: (reason: WidgetFetchError) => void;
  /* Told which version rendered, once it has. The version is what makes a
   * stale cache visible: "the page is showing 16 and you published 17". */
  onLoad?: (document: WidgetDocument) => void;
}

/* What was fetched, and which request it answers. The key is in the state
 * rather than cleared by the effect: a new id means what is in hand is the
 * wrong widget, and comparing during render is how that is known without
 * setting state inside an effect and starting a second render to say it. */
interface Fetched {
  key: string;
  document?: WidgetDocument;
  failure?: WidgetFetchError;
}

export function Widget({
  endpoint,
  widgetId,
  loading = null,
  error,
  onError,
  onLoad,
  ...view
}: WidgetProps) {
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const key = `${endpoint} ${widgetId}`;

  /*
   * The callbacks, held in a ref.
   *
   * They are usually written inline at the call site, so a new function
   * identity arrives on every render of the customer's page. In the effect's
   * dependencies that would re-fetch the widget every time anything around it
   * changed; left out of them, the effect would call whichever copy it closed
   * over first. A ref is neither: the effect depends on the address and the id,
   * and calls the callbacks the page has now.
   *
   * Written in an effect of its own rather than during render, because a ref
   * touched while rendering is a render with a side effect in it. This one is
   * declared above the fetch, and effects run in the order they are written, so
   * the first fetch already sees the callbacks it was mounted with.
   */
  const told = useRef({ onLoad, onError });
  useEffect(() => {
    told.current = { onLoad, onError };
  });

  useEffect(() => {
    const controller = new AbortController();

    const ask = async () => {
      try {
        const document = await fetchWidget(endpoint, widgetId, {
          signal: controller.signal,
        });
        setFetched({ key, document });
        told.current.onLoad?.(document);
      } catch (reason: unknown) {
        /* The abort is our own unmount. Reporting it would hand the customer an
         * error for something they did by navigating. */
        if (reason instanceof DOMException && reason.name === "AbortError")
          return;
        const failure =
          reason instanceof WidgetFetchError
            ? reason
            : new WidgetFetchError("The widget could not be fetched.", 0);
        setFetched({ key, failure });
        told.current.onError?.(failure);
      }
    };
    void ask();

    return () => controller.abort();
  }, [endpoint, widgetId, key]);

  /* Anything fetched for a different address or id is the wrong widget, so it
   * is loading rather than stale. */
  const current = fetched?.key === key ? fetched : null;

  if (current?.failure) return <>{error?.(current.failure) ?? null}</>;
  if (!current?.document) return <>{loading}</>;
  return <WidgetView definition={current.document.definition} {...view} />;
}
