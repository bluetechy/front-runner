import { createContext, useContext } from "react";
export const DEFAULT_RUNTIME = {
    mode: "flow",
    context: {},
    environment: {},
    narrow: false,
};
export const RuntimeContext = createContext(DEFAULT_RUNTIME);
/*
 * An element's view of the runtime.
 *
 * There is a default rather than a thrown "used outside a provider", because
 * an element rendered on its own is a legitimate thing to do: a test asserting
 * what a countdown draws, and a customer who has one element and no widget
 * around it, both get the defaults and something sensible on the screen.
 */
export function useRuntime() {
    return useContext(RuntimeContext);
}
//# sourceMappingURL=runtime.js.map