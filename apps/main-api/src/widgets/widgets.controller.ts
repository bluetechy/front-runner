import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  NotFoundException,
  Param,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { Public } from "../authentication/index.js";
import { widgetSchema } from "./widget.schema.js";
import { WidgetsService } from "./widgets.service.js";

/*
 * The one public endpoint in this API, and the only one a stranger's browser
 * ever calls.
 *
 * **Why it is not GraphQL.** Every other read in this product is a field on a
 * schema behind a token. This one is a definition being handed to a runtime
 * inside somebody else's web page: there is no account, nothing to select, and
 * the caller is a copy of our SDK that may be a year old. A plain `GET` with a
 * cacheable body is the right shape for that, it can sit behind a CDN, and it
 * needs no client library to consume. Adding a public root field to the
 * GraphQL schema would also have meant the first exception to "nothing in the
 * schema answers without a token", which `app.test.ts` enumerates and enforces
 * -- a rule worth more than the consistency would have been.
 *
 * **What is public here, exactly.** The definition. A widget is drawn on a page
 * anybody can open by code that cannot hold a credential, so anything in a
 * definition is published content: nothing private may be put in one, and
 * `docs/widgets.md` says so where an author will read it. The id is
 * unguessable, which keeps a definition from being enumerable, and it is not
 * authorization.
 */
@Controller("widgets")
@Public()
export class WidgetsController {
  constructor(private readonly service: WidgetsService) {}

  /* An id as dbo.SaveWidget mints them: 'w_' and sixteen random bytes as hex. */
  private static readonly ID = /^w_[0-9a-f]{32}$/;

  /*
   * The widget language itself, as JSON.
   *
   * Declared before the route below it, because Nest matches in the order the
   * handlers are written and `:widgetId` would otherwise swallow "schema".
   *
   * It is public and cached hard: it is the contract. A customer writing a
   * document by hand wants it, an editor wants it for autocompletion, and the
   * model that will eventually write these documents wants it as its
   * structured-output schema. Serving it from the same process that validates
   * against it is what stops those three from reading three different copies.
   */
  @Get("schema")
  @Header("Cache-Control", "public, max-age=3600")
  @Header("Access-Control-Allow-Origin", "*")
  schema() {
    return widgetSchema;
  }

  /*
   * One widget's current definition.
   *
   * The interesting part is the origin check, which is the whole of what a
   * browser is allowed to render and is enforced here rather than by the
   * application's own CORS allowlist. `CORS_ORIGINS` is the list of *our*
   * front ends; this is a list per widget, kept by whoever wrote it, because
   * one list for the whole product is not an allowlist -- it is a list of
   * everybody.
   *
   * Three answers, and each one is deliberate:
   *
   * | The request                                   | The answer                                     |
   * | --------------------------------------------- | ---------------------------------------------- |
   * | No `Origin` at all (curl, a server, a CDN)    | The definition, with no CORS header on it      |
   * | An `Origin` the document lists                | The definition, with that origin echoed back   |
   * | Any other `Origin`                            | 403, with a sentence a developer can read      |
   *
   * The first row is not a hole. CORS is a rule browsers keep about pages, and
   * a request with no browser in front of it was never subject to it: what a
   * definition is protected by against curl is that it is published content
   * reached by an unguessable id. Pretending otherwise by refusing requests
   * with no `Origin` would break every CDN and server-side render while
   * stopping nobody.
   *
   * The third row answers 403 *and* omits the header. The omission is what the
   * browser enforces; the status and the sentence are for the developer
   * integrating the widget, who otherwise gets an opaque "Failed to fetch"
   * with nothing in it about origins. Both, because they are read by different
   * people.
   */
  @Get(":widgetId")
  async widget(
    @Param("widgetId") widgetId: string,
    @Headers("origin") origin: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    /*
     * Named on every answer, including the refusals.
     *
     * Without it a shared cache can serve the copy it stored for one origin to
     * a page on another, which either leaks a widget past its allowlist or
     * denies one that was on it. It is the single most important header on this
     * route and the easiest to leave off.
     */
    response.setHeader("Vary", "Origin");

    if (!WidgetsController.ID.test(widgetId))
      throw new NotFoundException("No such widget");

    const found = await this.service.read(widgetId);
    /* One answer for "no such id" and for "not published yet": a different one
     * for each would tell a stranger which ids are real. */
    if (!found) throw new NotFoundException("No such widget");

    if (origin !== undefined && !this.allows(found.Definition, origin))
      throw new ForbiddenException(
        "This widget is not published to that origin. Add it to delivery.allowedOrigins in the widget's definition.",
      );

    if (origin !== undefined)
      response.setHeader("Access-Control-Allow-Origin", origin);

    /*
     * A minute.
     *
     * Long enough that a busy page is not asking per view, short enough that
     * publishing a version is visible while somebody is still looking at the
     * page they published it from. The number is a guess at a product nobody
     * is using yet and is meant to be revisited against real traffic, which is
     * a thing docs/TODO.md says rather than a thing pretended here.
     */
    response.setHeader("Cache-Control", "public, max-age=60");

    return {
      widgetId: found.WidgetId,
      version: found.Version,
      definition: found.Definition,
    };
  }

  /*
   * Whether a page on this origin may render this widget.
   *
   * Exact string equality against the list in the document, and nothing else.
   * No wildcards, no suffix matching, no case folding beyond what a browser
   * already did: `evil-northwind.test` ends with the same characters as
   * `northwind.test`, and a suffix rule is how that gets through. The entries
   * were checked when the document was saved -- see `isExactOrigin` -- so the
   * comparison here can be as dumb as it looks.
   *
   * A widget whose document lists nothing may be rendered from nowhere. That
   * is the strict direction and the deliberate one: an SDK shipped open and
   * closed later is an SDK whose customers all break on the day it is closed.
   *
   * `null` is refused by name. A `file://` page, a sandboxed iframe and some
   * redirects all send the literal string "null" as their origin, and it must
   * never match an entry -- which it could not here anyway, because
   * `isExactOrigin` refuses to store it.
   */
  private allows(definition: unknown, origin: string): boolean {
    if (origin === "null" || !origin) return false;
    const allowed = (
      definition as { delivery?: { allowedOrigins?: unknown } } | null
    )?.delivery?.allowedOrigins;
    if (!Array.isArray(allowed)) return false;
    return allowed.some((entry) => entry === origin);
  }
}
