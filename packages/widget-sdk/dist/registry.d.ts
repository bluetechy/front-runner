import type { ComponentType } from "react";
import type { ElementProps } from "./elements/element-props.js";
import type { NodeType, WidgetNode } from "./definition.js";
type Registry = {
    [K in NodeType]: ComponentType<ElementProps<Extract<WidgetNode, {
        type: K;
    }>>>;
};
export declare const registry: Registry;
export declare const elementTypes: NodeType[];
export {};
//# sourceMappingURL=registry.d.ts.map