import type { ActionEnvironment, EventSink } from "./actions.js";
import type { WidgetContext } from "./context.js";
import type { WidgetDefinition } from "./definition.js";
export interface WidgetViewProps {
    definition: WidgetDefinition;
    context?: WidgetContext;
    onEvent?: EventSink;
    environment?: ActionEnvironment;
    className?: string;
}
export declare function WidgetView({ definition, context, onEvent, environment, className, }: WidgetViewProps): import("react").JSX.Element;
//# sourceMappingURL=widget-view.d.ts.map