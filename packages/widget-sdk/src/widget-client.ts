import type { WidgetDocument } from "./definition.js";

/*
 * Fetching a widget by its id.
 *
 * One `GET` at a public address, answering the definition and the version it
 * is. There is no token on it: a widget is drawn on a page anybody can open,
 * so whatever a browser is given here is public by construction. What that
 * costs is written down in `apps/main-api/docs/widgets.md`, and the short
 * version is that a widget definition is published content and must never be
 * somewhere a private fact is put.
 *
 * The id is opaque and unguessable (32 hex characters behind a `w_`), which is
 * what stands between "public to whoever has the link" and "public to whoever
 * counts". That is not authorization and is not claimed to be: the origin
 * allowlist in the document decides which pages may render it, and the API is
 * what enforces that.
 */

export class WidgetFetchError extends Error {
  constructor(
    message: string,
    /* The HTTP status where there was one, and 0 where the request never got
     * an answer. The developer integrating this is the reader: "403" and "the
     * network refused" are different problems and lead to different pages of
     * the documentation. */
    readonly status: number,
  ) {
    super(message);
    this.name = "WidgetFetchError";
  }
}

/* A widget id as the API mints them. Checked here so that a mistyped id is a
 * sentence from this package rather than a 404 from a request that should not
 * have been made. */
const WIDGET_ID = /^w_[0-9a-f]{32}$/;

export function isWidgetId(value: string): boolean {
  return WIDGET_ID.test(value.trim());
}

export interface FetchOptions {
  /* Aborts the request. `<Widget>` passes one so that a widget unmounted
   * mid-flight does not resolve into a component nobody is looking at. */
  signal?: AbortSignal;
}

/*
 * Ask the API for one widget.
 *
 * `endpoint` is the base address of the API, without a path: the path is this
 * package's business and a customer should not have to know it. A trailing
 * slash is tolerated, because half of them will write one.
 */
export async function fetchWidget(
  endpoint: string,
  widgetId: string,
  options: FetchOptions = {},
): Promise<WidgetDocument> {
  const id = widgetId.trim();
  if (!isWidgetId(id))
    throw new WidgetFetchError(`"${widgetId}" is not a widget id`, 0);

  const base = endpoint.trim().replace(/\/+$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}/widgets/${id}`, {
      method: "GET",
      /* No cookies, ever. The widget is on somebody else's page and a request
       * carrying credentials from it would be this SDK making a page's session
       * available to our API without their having asked. */
      credentials: "omit",
      headers: { Accept: "application/json" },
      signal: options.signal,
    });
  } catch (error) {
    /* An abort is the caller's own doing and is rethrown as itself, so that
     * `<Widget>` can tell "we unmounted" from "the network is down" without
     * reading a message. */
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    /* A CORS refusal also arrives here, as a TypeError with nothing useful in
     * it, because the browser will not tell a page why. The sentence names the
     * likely cause rather than repeating "Failed to fetch", which is the
     * single most common thing to be stuck on when integrating this. */
    throw new WidgetFetchError(
      "The widget could not be fetched. If this page's origin is not on the widget's allowed origins, the browser will refuse the response without saying so.",
      0,
    );
  }

  if (!response.ok) {
    const message =
      response.status === 404
        ? "No widget with that id is published."
        : response.status === 403
          ? "This page's origin is not allowed to render that widget."
          : "The widget could not be fetched.";
    throw new WidgetFetchError(message, response.status);
  }

  const document = (await response.json()) as WidgetDocument;
  /* A shape check rather than a schema check. The API validated this document
   * against the schema before it was ever stored, and shipping a validator to
   * every customer's browser to check it again would be a large dependency
   * buying one thing: protection from our own API. What is worth checking here
   * is that this is a widget document at all, because that is what a proxy
   * returning an error page looks like. */
  if (!document?.definition?.root)
    throw new WidgetFetchError(
      "The API answered something that is not a widget.",
      response.status,
    );
  return document;
}
