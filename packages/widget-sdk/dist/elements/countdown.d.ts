import type { CountdownNode } from "../definition.js";
import type { ElementProps } from "./element-props.js";
export declare function remainingParts(milliseconds: number, format: string): {
    unit: string;
    value: number;
}[];
export declare function CountdownElement({ node }: ElementProps<CountdownNode>): import("react").JSX.Element | null;
//# sourceMappingURL=countdown.d.ts.map