/*
 * The values a host page supplies, and the `{{name}}` placeholders in a
 * document that read them.
 *
 * This is the seam that makes one widget definition say a different sentence
 * to every shopper without the document containing any logic. The page says
 * what it knows:
 *
 * ```jsx
 * <Widget widgetId="w_..." context={{ "cart.total": 50 }} />
 * ```
 *
 * and the document says where it goes:
 *
 * ```json
 * { "type": "text", "value": "You are {{remaining}} from free shipping" }
 * ```
 *
 * Flat keys with dots in them rather than a nested object, which is a
 * deliberate narrowing: a nested context would need a path resolver, and a
 * path resolver over host data is the kind of thing that ends up reaching
 * `__proto__`. A key is a string and a lookup is one property read on a plain
 * object.
 */
/* A placeholder: `{{` a key `}}`, where a key is letters, digits, dots,
 * underscores and hyphens. Anything else inside the braces is not a
 * placeholder and is left on the page as the author typed it, which is the
 * behavior that makes a stray brace visible instead of silently eaten. */
const PLACEHOLDER = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g;
/*
 * Replace every placeholder in a string.
 *
 * A key with no value is replaced with nothing rather than left as
 * `{{cart.total}}`. A widget on a page that has not supplied a context yet
 * should read as a sentence with a gap in it, not as a template somebody
 * forgot to render, and the gap is what tells the developer integrating it
 * that the key is missing.
 *
 * The result is text that React renders as text. Nothing here is interpreted
 * as markup: there is no `dangerouslySetInnerHTML` anywhere in this package,
 * so a context value containing a tag is a sentence containing the characters
 * of that tag.
 */
export function interpolate(value, context = {}, extra = {}) {
    return value.replace(PLACEHOLDER, (_match, key) => {
        const found = Object.hasOwn(extra, key)
            ? extra[key]
            : Object.hasOwn(context, key)
                ? context[key]
                : undefined;
        return found === undefined ? "" : String(found);
    });
}
/*
 * A number out of the context, for the elements that need one rather than a
 * sentence.
 *
 * A page supplying `"50"` where the document expects a number is the ordinary
 * case rather than a mistake: a cart total read out of the DOM is a string. So
 * a numeric string counts. Anything that is not a number at all answers
 * undefined, and the element decides what to draw instead. `Number("")` is 0,
 * which is why the empty string is excluded before the conversion.
 */
export function numberFrom(context, name) {
    const raw = context && Object.hasOwn(context, name) ? context[name] : undefined;
    if (typeof raw === "number")
        return Number.isFinite(raw) ? raw : undefined;
    if (typeof raw !== "string" || raw.trim() === "")
        return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
}
/*
 * The document's own `variables` are defaults, and the page's context wins.
 *
 * That order is the useful one: an author writes `{"cart.total": 0}` so the
 * widget renders sensibly in a preview, and a real page overrides it with what
 * is really in the cart. Merged once per render rather than consulted in two
 * places, so no element has to know there were two sources.
 */
export function withDefaults(variables, context) {
    return { ...variables, ...context };
}
/* Money where a currency was named, a plain number where it was not. The
 * viewer's own locale, taken from the browser: a Mexican shopper reading a
 * page in Spanish should not be told `$1,234.50` in American grouping. */
export function formatAmount(value, currency) {
    if (!currency)
        return String(Math.round(value * 100) / 100);
    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
        }).format(value);
    }
    catch {
        /* An unknown or malformed currency code is the author's mistake and not
         * worth taking the widget down for: the number is the part the viewer
         * needs. */
        return String(Math.round(value * 100) / 100);
    }
}
//# sourceMappingURL=context.js.map