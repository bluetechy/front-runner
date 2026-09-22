import { StrictMode, isValidElement, type ReactElement } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

/*
 * The first thing the browser runs.
 *
 * Importing this module *is* starting the app, so everything it touches is
 * replaced before the import and the whole of the boot is recorded once and
 * asserted on below. It runs once, because a module cannot be imported a
 * second time.
 *
 * What is worth pinning is the order the providers are nested in -- every one
 * of them wraps something that needs it -- and the two decisions no component
 * can change afterwards: one query client for the process, and one router.
 */

const render = vi.fn();
const createRoot = vi.fn(() => ({ render }));
const createRouter = vi.fn((options: unknown) => ({ options }));

vi.mock("react-dom/client", () => ({ createRoot }));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  createRouter,
  RouterProvider: () => null,
}));

const root = document.createElement("div");
root.id = "root";

/* What was handed to React, and what the router was made with. Captured
 * rather than read back later, so the test for a missing #root -- which
 * starts the module a second time -- cannot move these. */
let tree: ReactElement;
let routerOptions: { routeTree?: unknown; defaultPreload?: string };

beforeAll(async () => {
  document.body.append(root);
  await import("./main");
  tree = render.mock.calls[0]?.[0] as ReactElement;
  routerOptions = createRouter.mock.calls[0]?.[0] as typeof routerOptions;
});

/* Every element in the tree, outermost first. Children arrive as an array
 * wherever a provider has more than one, so both shapes are walked. */
function walk(node: unknown, found: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, found);
    return found;
  }
  if (!isValidElement(node)) return found;
  found.push(node);
  return walk((node.props as { children?: unknown }).children, found);
}

const nameOf = (element: ReactElement) => {
  const type = element.type as { name?: string; displayName?: string } | string;
  if (typeof type === "string") return type;
  if (type === (StrictMode as unknown)) return "StrictMode";
  return type.displayName ?? type.name ?? "anonymous";
};

const holding = (name: string) =>
  walk(tree).find((element) => nameOf(element) === name);

/* What the provider of that name was given. Empty where there is none, so a
 * missing provider fails on the property that was being asked about rather
 * than on the reading of it. */
const propsOf = <Props,>(name: string): Partial<Props> =>
  (holding(name)?.props ?? {}) as Partial<Props>;

describe("mounting", () => {
  it("mounts on the element index.html promises", () => {
    expect(createRoot).toHaveBeenCalledWith(root);
    expect(render).toHaveBeenCalledTimes(1);
  });

  // Development renders everything twice, which is how a component that
  // cannot survive being mounted twice is found before somebody else finds it.
  it("renders in StrictMode", () => {
    expect(tree.type).toBe(StrictMode);
  });
});

describe("what wraps what", () => {
  // The session is inside the query client because the hooks that read the
  // API ask the session for a token; both are inside the theme, because
  // everything drawn is.
  it("nests each provider inside the one it needs", () => {
    const order = walk(tree)
      .map(nameOf)
      .filter((name) =>
        [
          "StrictMode",
          "ThemeProvider",
          "QueryClientProvider",
          "SessionProvider",
          "RouterProvider",
        ].includes(name),
      );

    expect(order).toEqual([
      "StrictMode",
      "ThemeProvider",
      "QueryClientProvider",
      "SessionProvider",
      "RouterProvider",
    ]);
  });

  // Material's reset, once, at the top -- not a stylesheet of our own.
  it("lays Material's baseline under the whole app", () => {
    expect(holding("CssBaseline")).toBeDefined();
  });

  it("draws everything in this app's own theme", async () => {
    const { theme } = await import("./design-system");

    expect(propsOf<{ theme: unknown }>("ThemeProvider").theme).toBe(theme);
  });
});

describe("the router and the cache", () => {
  it("makes one router, over the generated tree, preloading on intent", () => {
    expect(routerOptions.defaultPreload).toBe("intent");
    expect(routerOptions.routeTree).toBeDefined();
  });

  // One client for the process, made outside any component so it survives a
  // re-render and a route change.
  //
  // A GraphQL error is usually a refused request rather than a flaky wire,
  // and retrying it three times just makes the browser wait longer to say so.
  it("retries a failed query once rather than three times", () => {
    const { client } = propsOf<{
      client: { getDefaultOptions: () => { queries?: { retry?: number } } };
    }>("QueryClientProvider");

    expect(client?.getDefaultOptions().queries?.retry).toBe(1);
  });
});

describe("an index.html with no #root in it", () => {
  // Rather than mounting on nothing and rendering into a void, which looks
  // like the bundle having failed to load.
  it("says so plainly rather than starting anyway", async () => {
    root.remove();

    /* Started a second time, from nothing: the module has already run once
     * above, and a module only runs once. This is last in the file for that
     * reason -- what it resets is not put back. */
    vi.resetModules();

    await expect(import("./main")).rejects.toThrow(/missing the #root element/);
  });
});
