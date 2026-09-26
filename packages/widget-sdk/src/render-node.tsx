import { registry } from "./registry.js";
import type { ComponentType } from "react";
import type { ElementProps } from "./elements/element-props.js";
import type { WidgetNode } from "./definition.js";

/*
 * The whole of the JSON-to-React engine: look the type up, render it, and do
 * the same to its children.
 *
 * It is about fifteen lines, and that is the point. Every decision about what
 * a widget can be is in the schema and the registry; nothing about any
 * particular element is in here, so a new capability never touches this file.
 *
 * Children are rendered here and passed down rather than by each container,
 * which is what keeps the imports acyclic: `container.tsx` does not import the
 * renderer that imports the registry that imports `container.tsx`.
 */
export function RenderNode({ node }: { node: WidgetNode }) {
  /* One cast, in one place. The registry's type guarantees that the component
   * under a key takes exactly the node with that `type`, but TypeScript cannot
   * follow the pairing through an index by a union-typed key -- so the
   * narrowing is asserted here rather than repeated in eight components. */
  const Element = registry[node.type] as
    ComponentType<ElementProps<WidgetNode>> | undefined;

  /*
   * A type nobody registered draws nothing.
   *
   * Nothing, rather than a placeholder or a thrown error. This is a widget on
   * somebody else's page: the failure mode that matters is an old copy of the
   * SDK meeting a document written against a newer schema, and the right
   * behavior there is that everything the old runtime understands still
   * renders and the one element it does not is absent. A page that threw would
   * take the customer's page down over a decoration.
   */
  if (!Element) return null;

  return (
    <Element node={node}>
      {node.type === "container"
        ? node.children?.map((child) => (
            <RenderNode key={child.id} node={child} />
          ))
        : null}
    </Element>
  );
}
