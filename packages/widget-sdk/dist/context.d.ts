export type WidgetContext = Record<string, string | number>;
export type Interpolations = Record<string, string | number>;
export declare function interpolate(value: string, context?: WidgetContext, extra?: Interpolations): string;
export declare function numberFrom(context: WidgetContext | undefined, name: string): number | undefined;
export declare function withDefaults(variables: WidgetContext | undefined, context: WidgetContext | undefined): WidgetContext;
export declare function formatAmount(value: number, currency?: string): string;
//# sourceMappingURL=context.d.ts.map