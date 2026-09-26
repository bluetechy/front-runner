import { useEffect, useState } from "react";
import { animationOf, placementOf, styleOf, typeScale } from "../style.js";
import { useRuntime } from "../runtime.js";
import type { CountdownNode } from "../definition.js";
import type { ElementProps } from "./element-props.js";

/*
 * Time left until a moment.
 *
 * This is the element that explains why the platform has a schema at all. The
 * author says *when*; the implementation of a clock is ours. The alternative --
 * a definition carrying the JavaScript that counts -- is a customer's page
 * executing whatever was in the document, and no amount of validating it makes
 * that safe.
 *
 * One interval per countdown, cleared when it unmounts. It ticks once a second
 * because the smallest unit any format shows is a second; a widget with
 * `MM:SS` on the screen does not need 60 frames a second to be right.
 */

/* The units each format shows, largest first. Keyed by the format string so
 * the document's vocabulary is the only place the shapes are written down. */
const UNITS: Record<
  string,
  readonly ("days" | "hours" | "minutes" | "seconds")[]
> = {
  "DD:HH:MM:SS": ["days", "hours", "minutes", "seconds"],
  "HH:MM:SS": ["hours", "minutes", "seconds"],
  "MM:SS": ["minutes", "seconds"],
};

const LABELS: Record<string, string> = {
  days: "days",
  hours: "hours",
  minutes: "minutes",
  seconds: "seconds",
};

/*
 * What is left, split into units.
 *
 * The largest unit the format shows carries the overflow: `HH:MM:SS` on a
 * three-day sale reads 72 hours rather than starting again at zero every
 * midnight. A countdown that silently dropped two days would be the worst kind
 * of wrong, because it would look right.
 */
export function remainingParts(
  milliseconds: number,
  format: string,
): { unit: string; value: number }[] {
  const units = UNITS[format] ?? UNITS["DD:HH:MM:SS"]!;
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const seconds = total % 60;
  const minutes = Math.floor(total / 60);
  const hours = Math.floor(total / 3600);
  const days = Math.floor(total / 86400);
  const of: Record<string, number> = {
    days,
    hours: units.includes("days") ? hours % 24 : hours,
    minutes: units.includes("hours") ? minutes % 60 : minutes,
    seconds,
  };
  return units.map((unit) => ({ unit, value: of[unit] ?? 0 }));
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function CountdownElement({ node }: ElementProps<CountdownNode>) {
  const { mode } = useRuntime();
  const target = Date.parse(node.target);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    /* Nothing to tick for a target that has already passed, or one that is not
     * a date at all. An interval running for the life of the page to recompute
     * the same expired state is a battery cost with no reader. */
    if (!Number.isFinite(target) || target <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [target]);

  /* A target that is not a date is the author's mistake, and the schema
   * refuses one, so this is the belt to that suspenders: draw nothing rather
   * than "NaN : NaN" on somebody's storefront. */
  if (!Number.isFinite(target)) return null;

  const left = target - now;
  const expired = left <= 0;
  const behavior = node.expired?.behavior ?? "zero";

  /* What happens at zero is the author's, and it has to be: a countdown that
   * reaches zero and sits there showing zeros is the most common way one of
   * these ends up lying on a page for a month. */
  if (expired && behavior === "hide") return null;

  const parts = remainingParts(
    expired ? 0 : left,
    node.format ?? "DD:HH:MM:SS",
  );
  const style = {
    display: "flex",
    alignItems: "baseline",
    gap: "0.4em",
    fontVariantNumeric: "tabular-nums" as const,
    ...typeScale("title"),
    ...placementOf(node, mode),
    ...styleOf(node.style),
    ...animationOf(node.animation),
  };

  if (expired && node.expired?.behavior === "replace")
    return (
      <p data-widget-node={node.id} style={{ margin: 0, ...style }}>
        {node.expired.text}
      </p>
    );

  return (
    <div
      data-widget-node={node.id}
      style={style}
      /*
       * A `<time>` carrying the deadline, and an accessible name that says
       * what the digits mean.
       *
       * Deliberately *not* an aria-live region. A politely announced update
       * every second is a screen reader that cannot be used to read the rest
       * of the page, which is a worse outcome than not hearing the seconds
       * tick. What is announced is the deadline, once: that is the fact
       * somebody needs, and the ticking digits are decoration on top of it.
       */
    >
      <time dateTime={node.target} style={{ display: "contents" }}>
        <span
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            whiteSpace: "nowrap",
          }}
        >
          {expired
            ? "Time is up"
            : `Time remaining: ${parts.map((part) => `${part.value} ${LABELS[part.unit]}`).join(", ")}`}
        </span>
        <span
          aria-hidden="true"
          style={{ display: "flex", alignItems: "baseline", gap: "0.4em" }}
        >
          {parts.map((part, index) => (
            <span
              key={part.unit}
              style={{ display: "flex", alignItems: "baseline", gap: "0.4em" }}
            >
              {index > 0 ? <span style={{ opacity: 0.5 }}>:</span> : null}
              <span>{pad(part.value)}</span>
            </span>
          ))}
        </span>
      </time>
    </div>
  );
}
