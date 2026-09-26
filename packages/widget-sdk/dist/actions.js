/*
 * What happens when somebody clicks something, and the one place a URL out of
 * a document is allowed to reach a browser.
 *
 * Three verbs, performed here. The document chooses between them and supplies
 * their arguments; it never supplies behavior. That is the property the whole
 * platform is built on, and this file is where it would be lost.
 */
/* The schemes a navigation may use. `javascript:` is script, `data:` is a
 * document the author wrote, `blob:` is the same with an extra step, and
 * `vbscript:` still exists. A relative URL has no scheme and is the common
 * case on a customer's own site, so it is allowed by falling through the
 * check rather than by a rule of its own.
 *
 * The list is an allowlist because a blocklist of schemes is a list somebody
 * has to keep, and browsers keep adding to the thing it would have to cover.
 * `mailto:` and `tel:` are here because a banner with a phone number on it is
 * an ordinary widget. */
const SAFE_SCHEMES = new Set(["http:", "https:", "mailto:", "tel:"]);
/* Characters a browser strips before it resolves a scheme, which is how a
 * colon can end up attached to something other than the word in front of it.
 * Anything holding one is refused rather than cleaned up: a URL in a
 * definition has no reason to contain a tab or a newline, so one that does is
 * either a mistake or an attempt. */
/* Deliberate: matching control characters is the whole point of the check. */
// oxlint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;
/*
 * Whether a URL out of a definition may be navigated to.
 *
 * This is the last check rather than the only one: the API refuses a document
 * whose URL fails the same test, so a widget carrying one never reaches a
 * browser. It is repeated here because this package is also handed definitions
 * the API did not validate (a preview in the studio, a document passed
 * straight to `WidgetView` in a test), and because the cost of the check is a
 * URL parse.
 */
export function isSafeUrl(url) {
    const trimmed = url.trim();
    if (!trimmed)
        return false;
    /* A protocol-relative URL inherits the page's scheme, which is fine, but it
     * also means `//evil.test` reads as a path to anybody skimming the
     * document. Refused, so that a navigation off the site is written as one. */
    if (trimmed.startsWith("//"))
        return false;
    if (CONTROL_CHARACTERS.test(trimmed))
        return false;
    /* No scheme at all is a relative URL: a path, a query or a fragment. */
    if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(trimmed))
        return true;
    try {
        return SAFE_SCHEMES.has(new URL(trimmed).protocol);
    }
    catch {
        return false;
    }
}
function navigateWith(url, newTab) {
    if (typeof window === "undefined")
        return;
    /* `noopener` on every new tab. Without it the page we opened can reach back
     * through `window.opener` to the customer's page, which is somebody else's
     * site being handed a handle by our widget. */
    if (newTab)
        window.open(url, "_blank", "noopener,noreferrer");
    else
        window.location.assign(url);
}
function copyWith(text) {
    void navigator?.clipboard?.writeText?.(text);
}
/*
 * Perform one action.
 *
 * A refused URL does nothing and reports nothing. It is not thrown: the click
 * came from somebody looking at a page that is mostly fine, and taking the
 * widget down over one bad link would be the wrong trade.
 */
export function performAction(action, nodeId, environment = {}) {
    const report = environment.onEvent;
    switch (action.type) {
        case "navigate": {
            if (!isSafeUrl(action.url))
                return;
            report?.({ type: "click", nodeId, action: "navigate" });
            (environment.navigate ?? navigateWith)(action.url.trim(), action.newTab ?? false);
            return;
        }
        case "trackEvent": {
            report?.({
                type: "click",
                nodeId,
                action: "trackEvent",
                name: action.name,
                properties: action.properties,
            });
            return;
        }
        case "copyText": {
            report?.({ type: "click", nodeId, action: "copyText" });
            (environment.copy ?? copyWith)(action.text);
            return;
        }
    }
}
//# sourceMappingURL=actions.js.map