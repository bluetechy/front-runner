/*
 * @no-test  One generic interface, erased at compile time: there is no
 * behavior here to assert. What it means is asserted by the eight elements
 * that implement it and by `render-node.tsx`, which supplies it.
 *
 * ---
 *
 * What every element is handed.
 *
 * `children` is here rather than each container rendering its own subtree, and
 * that is what keeps the registry from being circular: `render-node` walks the
 * tree and passes the rendered children in, so `container.tsx` does not import
 * the renderer that imports the registry that imports `container.tsx`.
 *
 * Everything else an element needs -- the layout mode, the host's context,
 * where a click goes -- is on the runtime context rather than in props. See
 * `runtime.ts`.
 */
import type { ReactNode } from "react";
import type { WidgetNode } from "../definition.js";

export interface ElementProps<Node extends WidgetNode> {
  node: Node;
  children?: ReactNode;
}
