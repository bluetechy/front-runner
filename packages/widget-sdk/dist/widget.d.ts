import { WidgetFetchError } from "./widget-client.js";
import type { ReactNode } from "react";
import type { WidgetDocument } from "./definition.js";
import type { WidgetViewProps } from "./widget-view.js";
export interface WidgetProps extends Omit<WidgetViewProps, "definition"> {
    endpoint: string;
    widgetId: string;
    loading?: ReactNode;
    error?: (reason: WidgetFetchError) => ReactNode;
    onError?: (reason: WidgetFetchError) => void;
    onLoad?: (document: WidgetDocument) => void;
}
export declare function Widget({ endpoint, widgetId, loading, error, onError, onLoad, ...view }: WidgetProps): import("react").JSX.Element;
//# sourceMappingURL=widget.d.ts.map