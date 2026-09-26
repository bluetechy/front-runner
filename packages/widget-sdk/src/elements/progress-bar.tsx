/* oxlint-disable jsx-a11y/prefer-tag-over-role -- the bar below is a
 * `<div role="progressbar">` on purpose; the reason is written where it is
 * drawn. */
import { formatAmount, interpolate, numberFrom } from "../context.js";
import { animationOf, placementOf, styleOf, typeScale } from "../style.js";
import { useRuntime } from "../runtime.js";
import type { ElementProps } from "./element-props.js";
import type { ProgressBarNode } from "../definition.js";

/*
 * Progress towards a goal, where the progress is the host page's fact rather
 * than the document's.
 *
 * This is the element that turns a widget platform into something more
 * interesting than a banner generator: "Free shipping over $75" is a picture,
 * and "You are $25 away from free shipping" is an application. One definition
 * says both, because the number comes from the page:
 *
 * ```jsx
 * <Widget widgetId="w_..." context={{ "cart.total": 50 }} />
 * ```
 *
 * A page that supplies nothing gets the document's own `variables` as
 * defaults, and a document with no default for the key draws an empty bar and
 * its incomplete sentence. Nothing here throws over a missing number: the
 * widget is on somebody else's page, and a page whose cart has not loaded yet
 * is the ordinary first frame rather than an error.
 */
export function ProgressBarElement({ node }: ElementProps<ProgressBarNode>) {
  const { mode, context } = useRuntime();

  const value =
    node.source.type === "number"
      ? node.source.value
      : (numberFrom(context, node.source.name) ?? 0);
  /* A goal of zero would divide by nothing and is refused by the schema; the
   * guard is here because this package also renders documents the API never
   * saw. */
  const goal = node.goal > 0 ? node.goal : 1;
  const ratio = Math.min(1, Math.max(0, value / goal));
  const complete = value >= node.goal;
  const remaining = Math.max(0, node.goal - value);

  /* The three values a sentence may name, formatted the way a reader expects
   * to see money or a count. `{{remaining}}` is the one that makes this
   * element worth having and the one a page could not compute for itself. */
  const message = complete
    ? node.messages?.complete
    : node.messages?.incomplete;
  const sentence = message
    ? interpolate(message, context, {
        remaining: formatAmount(remaining, node.currency),
        value: formatAmount(value, node.currency),
        goal: formatAmount(node.goal, node.currency),
      })
    : null;

  return (
    <div
      data-widget-node={node.id}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        width: "100%",
        ...placementOf(node, mode),
        ...animationOf(node.animation),
      }}
    >
      {sentence === null ? null : (
        <p style={{ margin: 0, ...typeScale("body"), ...styleOf(node.style) }}>
          {sentence}
        </p>
      )}
      {/*
       * A real progress bar to the accessibility tree, and two divs to the
       * eye. `progressbar` with the three aria values is what a screen reader
       * announces as a proportion; the sentence above it is what it announces
       * as a fact. Both, because neither one is sufficient: the bar has no
       * words and the sentence has no position.
       */}
      {/*
       * A `<div role="progressbar">` rather than a `<progress>` element, which
       * is the one place this package takes the ARIA role over the HTML tag.
       * The reason is styling: a native progress bar is painted by the browser
       * and is restyled only through vendor pseudo-elements
       * (`::-webkit-progress-value`, `::-moz-progress-bar`), which cannot be
       * written as inline styles -- and inline styles are the whole of how this
       * package avoids shipping CSS into a customer's page. What the role costs
       * is nothing a screen reader can tell: the three aria values below are
       * exactly what `<progress value max>` would announce. The rule saying
       * otherwise is turned off at the top of this file, because oxlint reads
       * no disable comment from inside JSX children.
       */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={node.goal}
        aria-valuenow={Math.min(value, node.goal)}
        aria-valuetext={sentence ?? undefined}
        style={{
          height: node.size?.height ?? 10,
          width: "100%",
          borderRadius: 999,
          overflow: "hidden",
          /* The track is the author's background where they set one, and a
           * neutral tint of whatever it sits on where they did not. */
          background: node.style?.background ?? "rgba(0, 0, 0, 0.12)",
        }}
      >
        <div
          style={{
            height: "100%",
            /* A percentage rather than pixels, so the bar is right before
             * anything has measured how wide it ended up being. */
            width: `${ratio * 100}%`,
            borderRadius: 999,
            background: node.style?.color ?? "currentColor",
            transition: "width 400ms ease-out",
          }}
        />
      </div>
    </div>
  );
}
