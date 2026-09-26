import type {
  Animation,
  LayoutMode,
  Layout,
  Style,
  WidgetNode,
} from "./definition.js";
import type { CSSProperties } from "react";

/*
 * A node's declared appearance, turned into the CSS the elements actually set.
 *
 * It is one file rather than a method on each element because the mapping is
 * the same wherever it is applied, and because it is the only place in this
 * package that decides what a document is allowed to do to a page. Everything
 * an element renders goes through here, so "can a definition set a
 * background-image" is a question with one answer and one place to read it.
 *
 * **Inline styles, not a stylesheet.** The SDK ships no CSS file and defines
 * no class names. A customer's page already has a design system -- MUI,
 * shadcn/ui, Tailwind, or a stylesheet somebody wrote in 2014 -- and a widget
 * that shipped class names would be a widget whose appearance depended on
 * which of those happened to be loaded. Inline styles cannot be reached by the
 * page's selectors, and nothing this package sets can leak out of it either.
 */

/* What an unstyled element looks like. A definition that sets nothing still
 * renders as something a person would take for a widget rather than as browser
 * defaults. */
const TYPE_SCALE: Record<string, { fontSize: number; fontWeight: number }> = {
  title: { fontSize: 32, fontWeight: 700 },
  subtitle: { fontSize: 20, fontWeight: 600 },
  body: { fontSize: 15, fontWeight: 400 },
  caption: { fontSize: 12, fontWeight: 400 },
};

export function typeScale(variant: string | undefined): CSSProperties {
  return TYPE_SCALE[variant ?? "body"] ?? TYPE_SCALE.body!;
}

/*
 * The visual properties, mapped one for one.
 *
 * A property the document did not set is left out rather than given a value,
 * so an element's own defaults survive: `{ ...typeScale(variant),
 * ...styleOf(node.style) }` is the order every element uses, and an author who
 * set nothing gets the scale.
 *
 * Colors are passed through as the author wrote them. A CSS color is data
 * rather than code -- there is no `url()` and no expression in a color
 * position that a browser will execute -- and the alternative, a palette this
 * package publishes, is a palette every customer's brand then has to be
 * approximated in.
 */
export function styleOf(style: Style | undefined): CSSProperties {
  if (!style) return {};
  const css: CSSProperties = {};
  if (style.background !== undefined) css.background = style.background;
  if (style.color !== undefined) css.color = style.color;
  if (style.fontSize !== undefined) css.fontSize = style.fontSize;
  if (style.fontWeight !== undefined) css.fontWeight = style.fontWeight;
  if (style.fontFamily !== undefined) css.fontFamily = style.fontFamily;
  if (style.textAlign !== undefined) css.textAlign = style.textAlign;
  if (style.textTransform !== undefined)
    css.textTransform = style.textTransform;
  if (style.lineHeight !== undefined) css.lineHeight = style.lineHeight;
  if (style.borderRadius !== undefined) css.borderRadius = style.borderRadius;
  if (style.opacity !== undefined) css.opacity = style.opacity;
  /* A border is two properties and an author sets one of them. A width with no
   * color is the author's color inherited, and a color with no width is a
   * hairline: either way something is drawn, which is what they asked for. */
  if (style.borderColor !== undefined || style.borderWidth !== undefined)
    css.border = `${style.borderWidth ?? 1}px solid ${style.borderColor ?? "currentColor"}`;
  if (style.shadow) css.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.25)";
  return css;
}

/* A container's flex properties. `start` and `end` rather than `flex-start`,
 * because the document's vocabulary is the shorter one and the translation
 * belongs here. */
const ALIGN: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

const JUSTIFY: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  "space-between": "space-between",
  "space-around": "space-around",
};

export function layoutOf(
  layout: Layout | undefined,
  stacked: boolean,
): CSSProperties {
  const direction = stacked ? "column" : (layout?.direction ?? "row");
  return {
    display: "flex",
    flexDirection: direction,
    alignItems: ALIGN[layout?.align ?? "center"],
    justifyContent: JUSTIFY[layout?.justify ?? "start"],
    gap: layout?.gap ?? 0,
    padding: layout?.padding ?? 0,
    flexWrap: layout?.wrap ? "wrap" : "nowrap",
    /* A flex child refuses to shrink below its content without this, which is
     * what makes a long sentence inside a row push the widget wider than the
     * element it was mounted in. */
    minWidth: 0,
  };
}

/*
 * Where a node sits, which depends on the mode the widget is in.
 *
 * In `absolute` a node is placed at its own coordinates inside the canvas'
 * coordinate space. In `flow` the container places it and `position` is
 * ignored -- deliberately ignored rather than an error, because a document
 * converted from freeform to flow keeps coordinates nobody needs to strip out
 * by hand.
 */
export function placementOf(node: WidgetNode, mode: LayoutMode): CSSProperties {
  const size: CSSProperties = {};
  if (node.size?.width !== undefined) size.width = node.size.width;
  if (node.size?.height !== undefined) size.height = node.size.height;

  if (mode !== "absolute") return size;
  return {
    ...size,
    position: "absolute",
    left: node.position?.x ?? 0,
    top: node.position?.y ?? 0,
  };
}

/*
 * The entrance animation, as a CSS animation naming a keyframe this package
 * defines once in `<Widget>`.
 *
 * `prefers-reduced-motion` is honored by the keyframes themselves rather than
 * here: the query is in the style element, so a viewer who has asked for less
 * motion gets the element at its final state instead of an animation this
 * file had to know about.
 */
export function animationOf(animation: Animation | undefined): CSSProperties {
  if (!animation) return {};
  return {
    animationName: `fr-widget-${animation.effect}`,
    animationDuration: `${animation.duration ?? 400}ms`,
    animationDelay: `${animation.delay ?? 0}ms`,
    animationFillMode: "both",
    animationTimingFunction: "ease-out",
  };
}
