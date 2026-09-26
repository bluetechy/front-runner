import { jsx as _jsx } from "react/jsx-runtime";
import { animationOf, placementOf, styleOf } from "../style.js";
import { isSafeUrl } from "../actions.js";
import { useRuntime } from "../runtime.js";
/*
 * A picture.
 *
 * `alt` is required by the schema, so there is nothing to decide here: an
 * image with no alternative text is an image a screen reader reads the URL of,
 * and the author is the only person who could know what it shows. Decoration
 * says so by passing "".
 *
 * The source goes through the same URL check a navigation does. A `src` is not
 * a navigation, but `javascript:` in one has been a way into a page before, and
 * a document is untrusted input however carefully it was validated upstream.
 * A refused source draws nothing rather than a broken-image glyph: a widget
 * missing a picture should look like a widget, not like a page that failed.
 *
 * Lazy, and with its own dimensions where the document gave them, so a widget
 * below the fold costs nothing until it is scrolled to and does not shift the
 * customer's page when it lands.
 */
export function ImageElement({ node }) {
    const { mode } = useRuntime();
    if (!isSafeUrl(node.src))
        return null;
    return (_jsx("img", { "data-widget-node": node.id, src: node.src.trim(), alt: node.alt, loading: "lazy", decoding: "async", width: node.size?.width, height: node.size?.height, style: {
            display: "block",
            objectFit: node.fit ?? "cover",
            ...placementOf(node, mode),
            ...styleOf(node.style),
            ...animationOf(node.animation),
        } }));
}
//# sourceMappingURL=image.js.map