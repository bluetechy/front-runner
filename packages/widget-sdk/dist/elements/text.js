import { jsx as _jsx } from "react/jsx-runtime";
import { interpolate } from "../context.js";
import { animationOf, placementOf, styleOf, typeScale } from "../style.js";
import { useRuntime } from "../runtime.js";
/*
 * Words.
 *
 * Rendered into a `<p>` rather than a `<div>` or an SVG `<text>`, which is the
 * whole argument for this platform being HTML first: a sentence in the DOM is
 * selectable, searchable by the browser's find, readable by a screen reader,
 * translatable by the page's own translation layer, and it reflows. A sentence
 * painted into an SVG or onto a canvas is a picture of a sentence.
 *
 * `variant` is a name for a size so that a document does not have to carry a
 * type scale in order to look like one thing; `style.fontSize` wins where an
 * author really does mean a number.
 *
 * `{{placeholders}}` are filled from the host page's context. The result is
 * text React renders as text: there is no `dangerouslySetInnerHTML` in this
 * package, so a value that looks like markup renders as its own characters.
 */
export function TextElement({ node }) {
    const { mode, context } = useRuntime();
    return (_jsx("p", { "data-widget-node": node.id, style: {
            margin: 0,
            ...typeScale(node.variant),
            ...placementOf(node, mode),
            ...styleOf(node.style),
            ...animationOf(node.animation),
        }, children: interpolate(node.value, context) }));
}
//# sourceMappingURL=text.js.map