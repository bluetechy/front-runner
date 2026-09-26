import type { ActionEnvironment } from "./actions.js";
import type { LayoutMode } from "./definition.js";
import type { WidgetContext } from "./context.js";
export interface WidgetRuntime {
    mode: LayoutMode;
    context: WidgetContext;
    environment: ActionEnvironment;
    narrow: boolean;
}
export declare const DEFAULT_RUNTIME: WidgetRuntime;
export declare const RuntimeContext: import("react").Context<WidgetRuntime>;
export declare function useRuntime(): WidgetRuntime;
//# sourceMappingURL=runtime.d.ts.map