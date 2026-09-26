/*
 * @no-test  Types and nothing else: every declaration in here is erased at
 * compile time, so there is no behavior to assert. What the shapes *mean* is
 * asserted by the elements that read them and, at the other end, by
 * `apps/main-api/src/widgets/widget.schema.json`, which is the authority.
 *
 * ---
 *
 * A widget definition: the document an author (a person today, a model later)
 * produces, the API validates, and this package renders.
 *
 * **The API's JSON Schema is the authority and this file is a copy of it.**
 * That is the arrangement the profile form already uses: the zod schema in
 * main-api decides, main-gui carries a copy so the browser can say the same
 * thing sooner, and the two are tested against the same cases at either end.
 * Here the copy buys a customer's editor autocompleting a document they are
 * writing by hand, and it buys this package its own types without depending
 * on the API's source. The cost is that a field added there has to be added
 * here, and `docs/widget-schema.md` is where that is written down.
 *
 * Nothing in here is a rectangle, a fill or a font stack. The types are
 * semantic -- a `button` with a `label` and an `action`, not a rect with text
 * on it -- because the renderer decides how intent becomes pixels, and
 * because a button that is a `<button>` is a button to a screen reader as
 * well as to a person looking at it.
 */

/* The version of the document format itself, as against the version of a
 * particular widget. One string rather than a number, so a `1.1` that adds an
 * element type is distinguishable from a `2.0` that moves something. */
export type SchemaVersion = "1.0";

/*
 * The two layout modes, and the reason there are two.
 *
 * `flow` is the default and the one to reach for: a container lays its
 * children out the way flexbox does, so the widget survives a phone, a
 * sidebar and a 4K monitor without anybody writing three of them. `absolute`
 * is for a composition that really is a fixed canvas -- artwork positioned to
 * the pixel, the freeform case -- and it is opt-in because a widget built
 * that way stops being responsive the moment it is chosen.
 */
export type LayoutMode = "flow" | "absolute";

export interface Canvas {
  /* The width the widget is designed at, in CSS pixels. In `flow` it is a
   * maximum rather than a promise; in `absolute` it is the coordinate space
   * every `position` is measured in. */
  width: number;
  /* Left out wherever the content decides the height, which in `flow` is
   * most of the time. Required in `absolute`, where nothing else can. */
  height?: number;
  /* Whether the widget scales down to the element it is mounted in. */
  responsive?: boolean;
}

/*
 * Where a browser is allowed to render this widget.
 *
 * Exact origins: scheme, host and port, no wildcards and no suffix matching.
 * `evil-northwind.test` ends with the same characters as `northwind.test`,
 * and a suffix rule is how that gets through.
 *
 * It lives in the document rather than in a column beside it so that one
 * pasted document is the whole of what a widget is. See
 * `apps/main-api/docs/widgets.md` for what the endpoint does with it, which
 * is the part that matters: an empty or absent list is a widget no browser on
 * another origin can render.
 */
export interface Delivery {
  allowedOrigins?: string[];
}

/*
 * What a click does. Three verbs, and each one is a thing this runtime
 * performs rather than a thing the document describes how to perform.
 *
 * There is no `javascript` action and there will not be one. The reason the
 * platform is shaped this way is that a definition cannot carry code: an
 * author choosing from three verbs cannot reach the customer's page, and a
 * verb added here is a verb we implemented and can reason about.
 */
export type Action =
  | { type: "navigate"; url: string; newTab?: boolean }
  | { type: "trackEvent"; name: string; properties?: Record<string, string> }
  | { type: "copyText"; text: string };

/* The ordinary visual properties an element may carry. Every one of them is
 * optional, and an element that sets none of them still renders: the defaults
 * are the renderer's, so a document is a description of what is wanted rather
 * than a full stylesheet. */
export interface Style {
  background?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  textAlign?: "left" | "center" | "right";
  textTransform?: "none" | "uppercase" | "capitalize";
  lineHeight?: number;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  shadow?: boolean;
}

/* How a container arranges its children, in the vocabulary flexbox already
 * has. `gap` and `padding` are numbers of CSS pixels rather than a scale,
 * because a document written against a scale needs the scale to be published
 * with it. */
export interface Layout {
  direction?: "row" | "column";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "space-between" | "space-around";
  gap?: number;
  padding?: number;
  wrap?: boolean;
  /* At or below this viewport width the container lays out as a column
   * whatever `direction` says. The one responsive lever in v1, and it is here
   * rather than in a general breakpoint system because stacking is what
   * almost every widget needs at a phone's width. */
  stackBelow?: number;
}

/* Where an element sits, in `absolute` only. Ignored in `flow`, where the
 * container decides. */
export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width?: number;
  height?: number;
}

/* One entrance animation, played once when the widget mounts. Not a
 * timeline: an author who wants a timeline wants a video, and a widget that
 * moves for as long as somebody is looking at it is a widget they close. */
export interface Animation {
  effect: "fadeIn" | "slideUp" | "pulse";
  /* Milliseconds. */
  duration?: number;
  delay?: number;
}

interface NodeCommon {
  /* Stable and the author's. It is what a later edit names ("make the Shop
   * Now button larger" is an edit to `cta-button`), and it is the React key,
   * so it must not be regenerated on every save. */
  id: string;
  style?: Style;
  position?: Position;
  size?: Size;
  animation?: Animation;
}

export interface ContainerNode extends NodeCommon {
  type: "container";
  layout?: Layout;
  children?: WidgetNode[];
}

export interface TextNode extends NodeCommon {
  type: "text";
  /* The words. `{{name}}` in here is replaced from the host's context: see
   * `context.ts`. */
  value: string;
  /* Which of the four type sizes this is, so a document does not have to
   * carry a type scale to look like one thing. `style.fontSize` overrides it
   * where an author really means a number. */
  variant?: "title" | "subtitle" | "body" | "caption";
}

export interface ImageNode extends NodeCommon {
  type: "image";
  src: string;
  /* Required, not optional. An image with no alternative text is an image a
   * screen reader reads the URL of, and the author is the only person who
   * knows what it shows. An image that is decoration says so with "". */
  alt: string;
  fit?: "cover" | "contain" | "fill";
}

export interface ButtonNode extends NodeCommon {
  type: "button";
  label: string;
  action: Action;
  variant?: "primary" | "secondary" | "ghost";
}

/*
 * A region that is clickable and has nothing drawn in it: the "hot area" over
 * artwork.
 *
 * `label` is required for the same reason `image.alt` is. A transparent
 * rectangle with a link in it is, to anybody not looking at the picture, a
 * link with no text, and this is the element most likely to be the only way
 * into something.
 */
export interface HotspotNode extends NodeCommon {
  type: "hotspot";
  label: string;
  action: Action;
}

/*
 * Time remaining until a moment, counted by this runtime.
 *
 * The author chooses the moment and the shape of the digits. What happens
 * when it runs out is also theirs, and it has to be: a countdown that reaches
 * zero and keeps sitting there showing zero is the most common way one of
 * these ends up lying on a page for a month.
 */
export interface CountdownNode extends NodeCommon {
  type: "countdown";
  /* An ISO 8601 instant, offset included. A local time with no offset is a
   * different moment in every timezone the page is read in. */
  target: string;
  /* Which units to show, largest first: "DD:HH:MM:SS", "HH:MM:SS", "MM:SS". */
  format?: "DD:HH:MM:SS" | "HH:MM:SS" | "MM:SS";
  expired?:
    | { behavior: "hide" }
    | { behavior: "replace"; text: string }
    | { behavior: "zero" };
}

/*
 * Progress towards a goal, where the progress is a number the host page
 * supplies -- a cart total, a points balance -- rather than anything in the
 * document.
 *
 * `messages` are sentences with `{{remaining}}`, `{{value}}` and `{{goal}}`
 * available in them, which is what makes "You are $25 away from free
 * shipping" one document rather than one per shopper.
 */
export interface ProgressBarNode extends NodeCommon {
  type: "progressBar";
  source:
    { type: "variable"; name: string } | { type: "number"; value: number };
  goal: number;
  messages?: { incomplete?: string; complete?: string };
  /* A currency code turns the numbers in those sentences into money, in the
   * viewer's own locale. Left out, they are plain numbers. */
  currency?: string;
}

/*
 * The one element that is drawn on a canvas, and the reason the platform has
 * a canvas at all.
 *
 * A hundred moving particles are a hundred DOM nodes and a hundred style
 * recalculations a frame in HTML, and one texture in a paint loop on a
 * canvas. They are also the case where nothing is lost by leaving the DOM:
 * falling snow is not a control, carries no text, and has nothing a screen
 * reader should be told about, so the canvas is `aria-hidden` and the widget
 * reads the same with it and without it.
 *
 * That is the whole test for whether something belongs on a canvas, and it is
 * why `button`, `text` and `hotspot` are not: the moment a thing is
 * interactive or says something, painting it as pixels means rebuilding
 * hit-testing, focus and accessibility that the browser already has.
 */
export interface ParticlesNode extends NodeCommon {
  type: "particles";
  effect: "snow" | "confetti";
  /* Particles per 10,000 square pixels. Capped by the renderer whatever is
   * asked for, because a document is not allowed to make somebody's phone
   * warm. */
  density?: number;
}

export type WidgetNode =
  | ContainerNode
  | TextNode
  | ImageNode
  | ButtonNode
  | HotspotNode
  | CountdownNode
  | ProgressBarNode
  | ParticlesNode;

/* Every element type, as strings. Exported because the API's schema and this
 * package's registry both have to agree on the list, and a test at either end
 * reads it. */
export type NodeType = WidgetNode["type"];

/*
 * The document.
 *
 * `root` is one container rather than an array of elements, because the tree
 * is the thing that makes a widget composable: a container holding a
 * container is how a row of two stacked pairs is described, and a flat array
 * cannot say it. React renders exactly this shape.
 */
export interface WidgetDefinition {
  schemaVersion: SchemaVersion;
  /* What the author calls it. Never rendered. */
  name?: string;
  canvas: Canvas;
  layout?: { type: LayoutMode };
  delivery?: Delivery;
  /* Defaults for the values the host page supplies, so a widget renders
   * sensibly on a page that supplies none of them. */
  variables?: Record<string, string | number>;
  root: ContainerNode;
  /* The author's own bookkeeping. Carried through untouched and never
   * rendered. */
  metadata?: Record<string, unknown>;
}

/*
 * What the public endpoint answers with: the definition, and the two facts
 * about *this* copy of it. The version is what makes a cached widget
 * debuggable ("the page is showing 16 and you published 17").
 */
export interface WidgetDocument {
  widgetId: string;
  version: number;
  definition: WidgetDefinition;
}
