import type { Action } from "./definition.js";
export declare function isSafeUrl(url: string): boolean;
export interface WidgetEvent {
    type: "click";
    nodeId: string;
    action: Action["type"];
    name?: string;
    properties?: Record<string, string>;
}
export type EventSink = (event: WidgetEvent) => void;
export interface ActionEnvironment {
    navigate?: (url: string, newTab: boolean) => void;
    copy?: (text: string) => void;
    onEvent?: EventSink;
}
export declare function performAction(action: Action, nodeId: string, environment?: ActionEnvironment): void;
//# sourceMappingURL=actions.d.ts.map