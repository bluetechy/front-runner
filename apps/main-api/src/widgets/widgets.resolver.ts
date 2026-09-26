import { BadRequestException } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { CurrentUser, type Principal } from "../authentication/index.js";
import { LIMITS } from "./widget.schema.js";
import { SavedWidget, WidgetSummary } from "./widgets.model.js";
import { WidgetsService } from "./widgets.service.js";

/* A widget id as dbo.SaveWidget mints them. Checked here so that an id from
 * somewhere else is refused before a query is made with it, and so that the
 * refusal is about the shape rather than about ownership. */
const WIDGET_ID = /^w_[0-9a-f]{32}$/;

/*
 * Writing widgets, and listing your own.
 *
 * Both operations are behind the token like everything else in this schema.
 * The only public thing in this vertical is the endpoint that serves a
 * definition to a customer's page, and that is a controller rather than a
 * resolver: see `widgets.controller.ts`, which also explains why it is not
 * GraphQL.
 */
@Resolver(() => SavedWidget)
export class WidgetsResolver {
  constructor(private readonly service: WidgetsService) {}

  @Query(() => [WidgetSummary])
  widgets(@CurrentUser() user: Principal) {
    return this.service.list(user.loginName);
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
   */
  @Mutation(() => SavedWidget)
  saveWidget(
    @CurrentUser() user: Principal,
    @Args("name", { type: () => String }) name: string,
    @Args("definition", { type: () => String }) definition: string,
    @Args("widgetId", { type: () => String, nullable: true })
    widgetId?: string,
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

    if (widgetId !== undefined && !WIDGET_ID.test(widgetId))
      throw new BadRequestException("That is not a widget id");

    return this.service.save(
      user.loginName,
      widgetId ?? null,
      trimmedName,
      definition,
    );
  }
}
