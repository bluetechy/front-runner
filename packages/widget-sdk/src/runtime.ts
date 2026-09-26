import { createContext, useContext } from "react";
import type { ActionEnvironment } from "./actions.js";
import type { LayoutMode } from "./definition.js";
import type { WidgetContext } from "./context.js";

/*
 * The four things every element needs and none of them should be handed down
 * through eight levels of container.
 *
 * A widget is a tree, and a tree is exactly the shape where passing props
 * through the middle costs the most: a container has no interest in the
 * layout mode or the host's cart total, and it would have to accept and
 * forward both so that the button three levels down can read them. So they go
 * through React's own context, which is what it is for.
 *
 * It is this package's context and not the customer's. Two widgets on one page
 * each mount their own provider, so a page can carry a banner reading
 * `cart.total` and a countdown reading nothing without either one seeing the
 * other's values.
 */
export interface WidgetRuntime {
  /* `flow` or `absolute`, from the document. An element asks because
   * placement means different things in the two. */
  mode: LayoutMode;
  /* The document's `variables` with the host page's context merged over them.
   * Merged once, in `WidgetView`. */
  context: WidgetContext;
  /* Where a navigation, a copy and an event go. Empty by default, which means
   * the browser's own behavior and nothing reported. */
  environment: ActionEnvironment;
  /* True when the widget is narrower than a container's `stackBelow`, which is
   * measured once in `WidgetView` rather than by every container asking the
   * window how wide it is. */
  narrow: boolean;
}

export const DEFAULT_RUNTIME: WidgetRuntime = {
  mode: "flow",
  context: {},
  environment: {},
  narrow: false,
};

export const RuntimeContext = createContext<WidgetRuntime>(DEFAULT_RUNTIME);

/*
 * An element's view of the runtime.
 *
 * There is a default rather than a thrown "used outside a provider", because
 * an element rendered on its own is a legitimate thing to do: a test asserting
 * what a countdown draws, and a customer who has one element and no widget
 * around it, both get the defaults and something sensible on the screen.
 */
export function useRuntime(): WidgetRuntime {
  return useContext(RuntimeContext);
}
