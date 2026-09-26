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
export { Widget, type WidgetProps } from "./widget.js";
export { WidgetView, type WidgetViewProps } from "./widget-view.js";

/* Fetching on its own, for a page that wants the document without the
 * component: a server-rendered site putting the definition in its own payload,
 * a build step, a test. */
export {
  fetchWidget,
  isWidgetId,
  WidgetFetchError,
  type FetchOptions,
} from "./widget-client.js";

/* Analytics is the next thing this package grows, and the shape a click
 * arrives in is part of the contract today so that it does not change when it
 * does. */
export type { ActionEnvironment, EventSink, WidgetEvent } from "./actions.js";

/* The document format, so a customer writing one by hand is type-checked
 * against the same contract the API validates. */
export type {
  Action,
  Animation,
  ButtonNode,
  Canvas,
  ContainerNode,
  CountdownNode,
  Delivery,
  HotspotNode,
  ImageNode,
  Layout,
  LayoutMode,
  NodeType,
  ParticlesNode,
  Position,
  ProgressBarNode,
  SchemaVersion,
  Size,
  Style,
  TextNode,
  WidgetDefinition,
  WidgetDocument,
  WidgetNode,
} from "./definition.js";

export type { WidgetContext } from "./context.js";

/* The vocabulary as data. A customer building an editor over this format
 * wants the list; so does the test in main-api that holds the schema and this
 * registry to the same eight types. */
export { elementTypes } from "./registry.js";
