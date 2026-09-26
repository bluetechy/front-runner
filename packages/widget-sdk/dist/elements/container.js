import { jsx as _jsx } from "react/jsx-runtime";
import { layoutOf, animationOf, placementOf, styleOf } from "../style.js";
import { useRuntime } from "../runtime.js";
/*
 * A box holding other elements, and the only element with children.
 *
 * It is what makes a definition composable: a row of two stacked pairs is a
 * container of two containers, and there is no other way to say it. Everything
 * else in the vocabulary is a leaf.
 *
 * Flexbox, not a grid and not coordinates. See `style.ts` for why the flow
 * mode is the default, and `stackBelow` for the one responsive lever a
 * document has: below that width the row becomes a column, which is what
 * almost every widget needs on a phone and what nobody should have to write a
 * second widget for.
 *
 * In `absolute` mode a container is still a flex box, but it is also the
 * positioning context its children are placed against -- so a freeform
 * composition nests properly instead of every coordinate being measured from
 * the page.
 */
export function ContainerElement({ node, children, }) {
    const { mode, narrow } = useRuntime();
    const stacks = narrow && node.layout?.stackBelow !== undefined;
    return (_jsx("div", { "data-widget-node": node.id, style: {
            ...layoutOf(node.layout, stacks),
            ...placementOf(node, mode),
            ...(mode === "absolute" ? { position: "relative" } : {}),
            ...styleOf(node.style),
            ...animationOf(node.animation),
            /* Restated after `placementOf`, which sets `position: absolute` on a
             * node in a freeform document. A container is both: placed by its
             * parent, and the origin its own children are placed against. The
             * order here is why a nested absolute container works at all. */
            ...(mode === "absolute" && node.position
                ? {
                    position: "absolute",
                    left: node.position.x,
                    top: node.position.y,
                }
                : {}),
        }, children: children }));
}
//# sourceMappingURL=container.js.map