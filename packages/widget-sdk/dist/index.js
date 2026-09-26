/*
 * The public surface of the SDK: what a customer may import, and the only
 * thing this package promises not to change without a major version.
 *
 * Everything else under `src/` is an implementation detail. The elements in
 * particular are deliberately not exported: they are reached by writing a
 * definition, which is the whole point of the platform, and exporting
 * `ButtonElement` would be publishing a second way to use this package that we
 * would then have to keep working.
 *
 * The same barrel convention as every vertical in the two applications: a
 * folder is reached through its index, and this package is one folder from the
 * outside. See apps/main-gui/docs/codebase-structure.md.
 */
/* The two components. `Widget` fetches and draws; `WidgetView` draws a
 * document somebody already has. */
export { Widget } from "./widget.js";
export { WidgetView } from "./widget-view.js";
/* Fetching on its own, for a page that wants the document without the
 * component: a server-rendered site putting the definition in its own payload,
 * a build step, a test. */
export { fetchWidget, isWidgetId, WidgetFetchError, } from "./widget-client.js";
/* The vocabulary as data. A customer building an editor over this format
 * wants the list; so does the test in main-api that holds the schema and this
 * registry to the same eight types. */
export { elementTypes } from "./registry.js";
//# sourceMappingURL=index.js.map