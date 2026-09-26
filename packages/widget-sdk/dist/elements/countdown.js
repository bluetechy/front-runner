import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { animationOf, placementOf, styleOf, typeScale } from "../style.js";
import { useRuntime } from "../runtime.js";
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
const UNITS = {
    "DD:HH:MM:SS": ["days", "hours", "minutes", "seconds"],
    "HH:MM:SS": ["hours", "minutes", "seconds"],
    "MM:SS": ["minutes", "seconds"],
};
const LABELS = {
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
export function remainingParts(milliseconds, format) {
    const units = UNITS[format] ?? UNITS["DD:HH:MM:SS"];
    const total = Math.max(0, Math.floor(milliseconds / 1000));
    const seconds = total % 60;
    const minutes = Math.floor(total / 60);
    const hours = Math.floor(total / 3600);
    const days = Math.floor(total / 86400);
    const of = {
        days,
        hours: units.includes("days") ? hours % 24 : hours,
        minutes: units.includes("hours") ? minutes % 60 : minutes,
        seconds,
    };
    return units.map((unit) => ({ unit, value: of[unit] ?? 0 }));
}
function pad(value) {
    return String(value).padStart(2, "0");
}
export function CountdownElement({ node }) {
    const { mode } = useRuntime();
    const target = Date.parse(node.target);
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        /* Nothing to tick for a target that has already passed, or one that is not
         * a date at all. An interval running for the life of the page to recompute
         * the same expired state is a battery cost with no reader. */
        if (!Number.isFinite(target) || target <= Date.now())
            return;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [target]);
    /* A target that is not a date is the author's mistake, and the schema
     * refuses one, so this is the belt to that suspenders: draw nothing rather
     * than "NaN : NaN" on somebody's storefront. */
    if (!Number.isFinite(target))
        return null;
    const left = target - now;
    const expired = left <= 0;
    const behavior = node.expired?.behavior ?? "zero";
    /* What happens at zero is the author's, and it has to be: a countdown that
     * reaches zero and sits there showing zeros is the most common way one of
     * these ends up lying on a page for a month. */
    if (expired && behavior === "hide")
        return null;
    const parts = remainingParts(expired ? 0 : left, node.format ?? "DD:HH:MM:SS");
    const style = {
        display: "flex",
        alignItems: "baseline",
        gap: "0.4em",
        fontVariantNumeric: "tabular-nums",
        ...typeScale("title"),
        ...placementOf(node, mode),
        ...styleOf(node.style),
        ...animationOf(node.animation),
    };
    if (expired && node.expired?.behavior === "replace")
        return (_jsx("p", { "data-widget-node": node.id, style: { margin: 0, ...style }, children: node.expired.text }));
    return (_jsx("div", { "data-widget-node": node.id, style: style, children: _jsxs("time", { dateTime: node.target, style: { display: "contents" }, children: [_jsx("span", { style: {
                        position: "absolute",
                        width: 1,
                        height: 1,
                        overflow: "hidden",
                        clip: "rect(0 0 0 0)",
                        whiteSpace: "nowrap",
                    }, children: expired
                        ? "Time is up"
                        : `Time remaining: ${parts.map((part) => `${part.value} ${LABELS[part.unit]}`).join(", ")}` }), _jsx("span", { "aria-hidden": "true", style: { display: "flex", alignItems: "baseline", gap: "0.4em" }, children: parts.map((part, index) => (_jsxs("span", { style: { display: "flex", alignItems: "baseline", gap: "0.4em" }, children: [index > 0 ? _jsx("span", { style: { opacity: 0.5 }, children: ":" }) : null, _jsx("span", { children: pad(part.value) })] }, part.unit))) })] }) }));
}
//# sourceMappingURL=countdown.js.map