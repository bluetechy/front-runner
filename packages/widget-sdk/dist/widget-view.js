import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { RenderNode } from "./render-node.js";
import { RuntimeContext } from "./runtime.js";
import { withDefaults } from "./context.js";
/*
 * The keyframes the entrance animations name, written into the document once
 * however many widgets are on the page.
 *
 * A `<style>` element rather than inline styles, because keyframes cannot be
 * expressed inline; it is the one piece of CSS this package emits and every
 * rule in it is prefixed `fr-widget-`, so nothing here can match anything on
 * the customer's page. The reduced-motion query is here rather than in
 * `style.ts` for the same reason: at that point the decision is a media query,
 * which is a stylesheet's job and not a component's.
 */
const KEYFRAMES = `
@keyframes fr-widget-fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes fr-widget-slideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }
@keyframes fr-widget-pulse { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.04) } }
@media (prefers-reduced-motion: reduce) {
  [data-widget-root] * { animation: none !important; transition: none !important }
}
`;
/* The narrowest `stackBelow` anywhere in the tree. One number, found once:
 * every container asking the window how wide it is would be a resize listener
 * per container, and they would all be asking the same question. */
function stackBelowOf(definition) {
    let smallest = 0;
    const walk = (node) => {
        if (!node)
            return;
        const below = node.layout?.stackBelow;
        if (below !== undefined)
            smallest = Math.max(smallest, below);
        for (const child of node.children ?? [])
            if (child.type === "container")
                walk(child);
    };
    walk(definition.root);
    return smallest;
}
export function WidgetView({ definition, context, onEvent, environment, className, }) {
    const hostRef = useRef(null);
    const [width, setWidth] = useState(null);
    const stackBelow = stackBelowOf(definition);
    /*
     * How wide the widget actually is, watched with a ResizeObserver.
     *
     * The element it is mounted in, not the window. A widget in a 320px sidebar
     * on a 27-inch monitor is narrow, and a media query would call it wide: the
     * customer's page decides how much room this gets, so the only honest
     * measurement is of the box we were given.
     */
    useEffect(() => {
        const host = hostRef.current;
        if (!host || stackBelow === 0)
            return;
        if (typeof ResizeObserver === "undefined") {
            setWidth(host.clientWidth);
            return;
        }
        const observer = new ResizeObserver(([entry]) => {
            setWidth(entry?.contentRect.width ?? host.clientWidth);
        });
        observer.observe(host);
        return () => observer.disconnect();
    }, [stackBelow]);
    const runtime = useMemo(() => ({
        mode: definition.layout?.type ?? "flow",
        context: withDefaults(definition.variables, context),
        environment: { ...environment, onEvent: onEvent ?? environment?.onEvent },
        narrow: width !== null && stackBelow > 0 && width <= stackBelow,
    }), [definition, context, environment, onEvent, width, stackBelow]);
    const responsive = definition.canvas.responsive ?? true;
    return (_jsxs("div", { ref: hostRef, "data-widget-root": "", className: className, style: {
            /* The design width is a maximum, not a promise. A responsive widget in
             * a narrower column is as wide as the column; in a wider one it stops
             * at the width it was designed at rather than stretching a banner
             * across a 4K monitor. */
            width: responsive ? "100%" : definition.canvas.width,
            maxWidth: definition.canvas.width,
            height: definition.canvas.height,
            /* The positioning context for a freeform document, and the thing a
             * decorative canvas is absolutely positioned across in either mode. */
            position: "relative",
            /* Nothing inside a widget may paint outside it. On somebody else's
             * page that is not tidiness: it is the difference between a widget and
             * a widget that has covered their checkout button. */
            overflow: "hidden",
            /* The one inherited property worth setting, so a widget that sets no
             * font at all looks like the page it is on rather than like Times. */
            fontFamily: "inherit",
            boxSizing: "border-box",
        }, children: [_jsx("style", { children: KEYFRAMES }), _jsx(RuntimeContext.Provider, { value: runtime, children: _jsx(RenderNode, { node: definition.root }) })] }));
}
//# sourceMappingURL=widget-view.js.map