import { performAction } from "../actions.js";
import { interpolate } from "../context.js";
import { animationOf, placementOf, styleOf } from "../style.js";
import { useRuntime } from "../runtime.js";
import type { ButtonNode } from "../definition.js";
import type { CSSProperties } from "react";
import type { ElementProps } from "./element-props.js";

/*
 * The thing somebody is meant to press.
 *
 * A real `<button>`, which is the second half of the argument in `text.tsx`.
 * The browser gives a button keyboard focus, the space and enter keys, a focus
 * ring, a role a screen reader announces and the hit target a phone expects.
 * A rectangle with a label on it, painted onto a canvas or drawn as an SVG
 * `<rect>`, has none of that, and every one of them would have to be rebuilt
 * here.
 *
 * Not an `<a>` even when the action navigates. Two of the three actions are not
 * navigations, and an anchor whose href does nothing is worse for a screen
 * reader than a button that does something. What a navigation loses by not
 * being an anchor is the middle click and the context menu, which is the
 * trade this makes knowingly: see docs/TODO.md.
 *
 * Three variants, and they are the renderer's colors rather than the
 * document's, so a widget with no styling at all still has a button that looks
 * pressable. Anything in `style` wins over them.
 */
const VARIANTS: Record<string, CSSProperties> = {
  primary: { background: "#111111", color: "#ffffff", border: "none" },
  secondary: {
    background: "transparent",
    color: "inherit",
    border: "1px solid currentColor",
  },
  ghost: { background: "transparent", color: "inherit", border: "none" },
};

export function ButtonElement({ node }: ElementProps<ButtonNode>) {
  const { mode, context, environment } = useRuntime();

  return (
    <button
      type="button"
      data-widget-node={node.id}
      onClick={() => performAction(node.action, node.id, environment)}
      style={{
        font: "inherit",
        fontWeight: 600,
        cursor: "pointer",
        padding: "0.65rem 1.25rem",
        borderRadius: 8,
        ...VARIANTS[node.variant ?? "primary"],
        ...placementOf(node, mode),
        ...styleOf(node.style),
        ...animationOf(node.animation),
      }}
    >
      {interpolate(node.label, context)}
    </button>
  );
}
