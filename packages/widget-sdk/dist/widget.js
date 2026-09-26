import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { WidgetView } from "./widget-view.js";
import { fetchWidget, WidgetFetchError } from "./widget-client.js";
export function Widget({ endpoint, widgetId, loading = null, error, onError, onLoad, ...view }) {
    const [fetched, setFetched] = useState(null);
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
            }
            catch (reason) {
                /* The abort is our own unmount. Reporting it would hand the customer an
                 * error for something they did by navigating. */
                if (reason instanceof DOMException && reason.name === "AbortError")
                    return;
                const failure = reason instanceof WidgetFetchError
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
    if (current?.failure)
        return _jsx(_Fragment, { children: error?.(current.failure) ?? null });
    if (!current?.document)
        return _jsx(_Fragment, { children: loading });
    return _jsx(WidgetView, { definition: current.document.definition, ...view });
}
//# sourceMappingURL=widget.js.map