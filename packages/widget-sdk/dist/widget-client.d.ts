import type { WidgetDocument } from "./definition.js";
export declare class WidgetFetchError extends Error {
    readonly status: number;
    constructor(message: string, status: number);
}
export declare function isWidgetId(value: string): boolean;
export interface FetchOptions {
    signal?: AbortSignal;
}
export declare function fetchWidget(endpoint: string, widgetId: string, options?: FetchOptions): Promise<WidgetDocument>;
//# sourceMappingURL=widget-client.d.ts.map