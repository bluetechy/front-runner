import { BadRequestException } from "@nestjs/common";
import { Args, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { CurrentUser, type Principal } from "../authentication/index.js";
import { LIMITS } from "./widget.schema.js";
import {
  SavedWidget,
  WidgetDocument,
  WidgetSummary,
  WidgetVersion,
} from "./widgets.model.js";
import { WidgetsService } from "./widgets.service.js";

/* A widget id as dbo.SaveWidget mints them. Checked here so that an id from
 * somewhere else is refused before a query is made with it, and so that the
 * refusal is about the shape rather than about ownership. */
const WIDGET_ID = /^w_[0-9a-f]{32}$/;

/* A version number a caller may name. The upper bound is not a real limit on
 * how often a widget may be saved: it is a bound on what a caller may ask for,
 * so a nonsense number is a sentence rather than a query. */
const MAX_VERSION = 1_000_000;

/*
 * Writing widgets, reading your own back, and deciding which version the world
 * sees.
 *
 * Every operation here is behind the token like the rest of the schema. The
 * only public thing in this vertical is the endpoint that serves a definition
 * to a customer's page, and that is a controller rather than a resolver: see
 * `widgets.controller.ts`, which also explains why it is not GraphQL.
 *
 * The three verbs are worth reading as a set, because the split between them is
 * the lifecycle:
 *
 *   saveWidget       writes a version and moves the draft. Nobody is served it.
 *   publishWidget    points browsers at a version. Also the rollback.
 *   unpublishWidget  points browsers at nothing, and deletes nothing.
 */
@Resolver(() => SavedWidget)
export class WidgetsResolver {
  constructor(private readonly service: WidgetsService) {}

  @Query(() => [WidgetSummary])
  widgets(@CurrentUser() user: Principal) {
    return this.service.list(user.loginName);
  }

  /*
   * One of your own definitions, to open in the studio.
   *
   * Null for a version that is not there, which is an ordinary answer: a
   * version number that arrived from a stale page is a page asking for
   * something that no longer exists rather than an error.
   *
   * `version` absent means the draft. Naming one is how an old version is
   * looked at before it is published, which is what makes rollback something
   * somebody can check rather than guess at.
   */
  @Query(() => WidgetDocument, { nullable: true })
  widgetDefinition(
    @CurrentUser() user: Principal,
    @Args("widgetId", { type: () => String }) widgetId: string,
    @Args("version", { type: () => Int, nullable: true }) version?: number,
  ) {
    this.demandId(widgetId);
    return this.service.definition(
      user.loginName,
      widgetId,
      this.demandVersion(version) ?? null,
    );
  }

  /* A widget's history, newest first: what there is to go back to. */
  @Query(() => [WidgetVersion])
  widgetVersions(
    @CurrentUser() user: Principal,
    @Args("widgetId", { type: () => String }) widgetId: string,
  ) {
    this.demandId(widgetId);
    return this.service.versions(user.loginName, widgetId);
  }

  /*
   * Save a definition, as a new widget or as the next version of one.
   *
   * `widgetId` absent means "make one". It is not two mutations because the
   * studio page has one button and the difference between the two is whether it
   * is holding an id -- and because the interesting half of this operation,
   * validating the document, is identical either way.
   *
   * The definition is a `String` holding JSON rather than a structured input
   * type. What a valid widget is has one authority and it is the JSON Schema;
   * describing the same shapes a second time in GraphQL would be a second
   * authority that disagreed with it by next month. See `widgets.service.ts`.
   *
   * A document that fails validation comes back as a 400 whose message names
   * every field that was wrong, joined with "; ". That is what `ZodPipe` does
   * for the profile form, and the studio page shows it in a toast and lists it
   * under the field.
   *
   * `expectedDraftVersion` is what the studio read the document at. Passing it
   * is how two tabs are kept from overwriting each other; leaving it out is
   * what a caller that never opened anything does.
   */
  @Mutation(() => SavedWidget)
  saveWidget(
    @CurrentUser() user: Principal,
    @Args("name", { type: () => String }) name: string,
    @Args("definition", { type: () => String }) definition: string,
    @Args("widgetId", { type: () => String, nullable: true })
    widgetId?: string,
    @Args("expectedDraftVersion", { type: () => Int, nullable: true })
    expectedDraftVersion?: number,
  ) {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 200)
      throw new BadRequestException("A name of 1-200 characters is required");

    /* The body limit already refuses anything enormous, but it refuses it as a
     * 413 with nothing in it about widgets. This is the same bound said in the
     * document's own terms, and it is checked before the JSON is parsed. */
    if (Buffer.byteLength(definition, "utf8") > LIMITS.definitionBytes)
      throw new BadRequestException(
        `the document: is longer than ${LIMITS.definitionBytes} bytes`,
      );

    if (widgetId !== undefined) this.demandId(widgetId);

    return this.service.save(
      user.loginName,
      widgetId ?? null,
      trimmedName,
      definition,
      this.demandVersion(expectedDraftVersion) ?? null,
    );
  }

  /*
   * Publish a version, which is also how a widget is rolled back.
   *
   * The version is required. "Publish the latest" would make the operation's
   * meaning depend on when it arrived, and the studio always knows which
   * version it means: the one on the row somebody pressed.
   */
  @Mutation(() => SavedWidget)
  publishWidget(
    @CurrentUser() user: Principal,
    @Args("widgetId", { type: () => String }) widgetId: string,
    @Args("version", { type: () => Int }) version: number,
  ) {
    this.demandId(widgetId);
    const wanted = this.demandVersion(version);
    if (wanted === null)
      throw new BadRequestException("A version is required to publish");
    return this.service.publish(user.loginName, widgetId, wanted);
  }

  /* Take it off the sites it is on. Nothing is deleted, and publishing again
   * puts the same id back on the same pages. */
  @Mutation(() => SavedWidget)
  unpublishWidget(
    @CurrentUser() user: Principal,
    @Args("widgetId", { type: () => String }) widgetId: string,
  ) {
    this.demandId(widgetId);
    return this.service.unpublish(user.loginName, widgetId);
  }

  private demandId(widgetId: string): void {
    if (!WIDGET_ID.test(widgetId))
      throw new BadRequestException("That is not a widget id");
  }

  /* A version has to be a whole number somebody could have saved. Refused here
   * rather than by the database, so that a float or a negative is a sentence
   * about the argument instead of a query that matches nothing. */
  private demandVersion(version: number | undefined): number | null {
    if (version === undefined) return null;
    if (!Number.isInteger(version) || version < 1 || version > MAX_VERSION)
      throw new BadRequestException("That is not a version number");
    return version;
  }
}
