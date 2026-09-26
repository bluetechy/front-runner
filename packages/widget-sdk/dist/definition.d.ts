export type SchemaVersion = "1.0";
export type LayoutMode = "flow" | "absolute";
export interface Canvas {
    width: number;
    height?: number;
    responsive?: boolean;
}
export interface Delivery {
    allowedOrigins?: string[];
}
export type Action = {
    type: "navigate";
    url: string;
    newTab?: boolean;
} | {
    type: "trackEvent";
    name: string;
    properties?: Record<string, string>;
} | {
    type: "copyText";
    text: string;
};
export interface Style {
    background?: string;
    color?: string;
    fontSize?: number;
    fontWeight?: number;
    fontFamily?: string;
    textAlign?: "left" | "center" | "right";
    textTransform?: "none" | "uppercase" | "capitalize";
    lineHeight?: number;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    opacity?: number;
    shadow?: boolean;
}
export interface Layout {
    direction?: "row" | "column";
    align?: "start" | "center" | "end" | "stretch";
    justify?: "start" | "center" | "end" | "space-between" | "space-around";
    gap?: number;
    padding?: number;
    wrap?: boolean;
    stackBelow?: number;
}
export interface Position {
    x: number;
    y: number;
}
export interface Size {
    width?: number;
    height?: number;
}
export interface Animation {
    effect: "fadeIn" | "slideUp" | "pulse";
    duration?: number;
    delay?: number;
}
interface NodeCommon {
    id: string;
    style?: Style;
    position?: Position;
    size?: Size;
    animation?: Animation;
}
export interface ContainerNode extends NodeCommon {
    type: "container";
    layout?: Layout;
    children?: WidgetNode[];
}
export interface TextNode extends NodeCommon {
    type: "text";
    value: string;
    variant?: "title" | "subtitle" | "body" | "caption";
}
export interface ImageNode extends NodeCommon {
    type: "image";
    src: string;
    alt: string;
    fit?: "cover" | "contain" | "fill";
}
export interface ButtonNode extends NodeCommon {
    type: "button";
    label: string;
    action: Action;
    variant?: "primary" | "secondary" | "ghost";
}
export interface HotspotNode extends NodeCommon {
    type: "hotspot";
    label: string;
    action: Action;
}
export interface CountdownNode extends NodeCommon {
    type: "countdown";
    target: string;
    format?: "DD:HH:MM:SS" | "HH:MM:SS" | "MM:SS";
    expired?: {
        behavior: "hide";
    } | {
        behavior: "replace";
        text: string;
    } | {
        behavior: "zero";
    };
}
export interface ProgressBarNode extends NodeCommon {
    type: "progressBar";
    source: {
        type: "variable";
        name: string;
    } | {
        type: "number";
        value: number;
    };
    goal: number;
    messages?: {
        incomplete?: string;
        complete?: string;
    };
    currency?: string;
}
export interface ParticlesNode extends NodeCommon {
    type: "particles";
    effect: "snow" | "confetti";
    density?: number;
}
export type WidgetNode = ContainerNode | TextNode | ImageNode | ButtonNode | HotspotNode | CountdownNode | ProgressBarNode | ParticlesNode;
export type NodeType = WidgetNode["type"];
export interface WidgetDefinition {
    schemaVersion: SchemaVersion;
    name?: string;
    canvas: Canvas;
    layout?: {
        type: LayoutMode;
    };
    delivery?: Delivery;
    variables?: Record<string, string | number>;
    root: ContainerNode;
    metadata?: Record<string, unknown>;
}
export interface WidgetDocument {
    widgetId: string;
    version: number;
    definition: WidgetDefinition;
}
export {};
//# sourceMappingURL=definition.d.ts.map