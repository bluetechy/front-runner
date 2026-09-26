import type { ReactNode } from "react";
import type { WidgetNode } from "../definition.js";
export interface ElementProps<Node extends WidgetNode> {
    node: Node;
    children?: ReactNode;
}
//# sourceMappingURL=element-props.d.ts.map