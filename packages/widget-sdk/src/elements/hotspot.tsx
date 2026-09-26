import { performAction } from "../actions.js";
import { placementOf } from "../style.js";
import { useRuntime } from "../runtime.js";
import type { ElementProps } from "./element-props.js";
import type { HotspotNode } from "../definition.js";

/*
 * A clickable region with nothing drawn in it: the hot area over a picture.
 *
 * This is the element that would be easiest to do badly. A transparent
 * rectangle is, to anybody not looking at the screen, nothing at all -- and it
 * is often the only way into whatever the picture is advertising. So it is a
 * `<button>` with a real accessible name, which the schema makes required, and
 * it takes focus and shows a focus ring in its turn like every other control on
 * the customer's page.
 *
 * It is invisible and it is not hidden. Those are different: `opacity: 0` or
 * `aria-hidden` would take it out of the accessibility tree, and what is wanted
 * is a control that is announced and not painted.
 *
 * Almost always used in a freeform composition, because a region over a
 * picture is the case coordinates exist for. In flow mode it is a
 * zero-decoration button that the container places, which is unusual but not
 * wrong.
 */
export function HotspotElement({ node }: ElementProps<HotspotNode>) {
  const { mode, environment } = useRuntime();

  return (
    <button
      type="button"
      data-widget-node={node.id}
      aria-label={node.label}
      onClick={() => performAction(node.action, node.id, environment)}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        /* The two dimensions matter more here than anywhere else: a hotspot
         * with no size is a control nobody can hit. Falling back to the whole
         * of its container is the useful answer -- a picture with one link on
         * it is the common case -- and a document that means a corner says so
         * with a size. */
        width: node.size?.width ?? "100%",
        height: node.size?.height ?? "100%",
        ...placementOf(node, mode),
      }}
    />
  );
}
