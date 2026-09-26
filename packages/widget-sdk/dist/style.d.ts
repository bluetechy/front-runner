import type { Animation, LayoutMode, Layout, Style, WidgetNode } from "./definition.js";
import type { CSSProperties } from "react";
export declare function typeScale(variant: string | undefined): CSSProperties;
export declare function styleOf(style: Style | undefined): CSSProperties;
export declare function layoutOf(layout: Layout | undefined, stacked: boolean): CSSProperties;
export declare function placementOf(node: WidgetNode, mode: LayoutMode): CSSProperties;
export declare function animationOf(animation: Animation | undefined): CSSProperties;
//# sourceMappingURL=style.d.ts.map