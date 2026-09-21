import { ParseUUIDPipe } from "@nestjs/common";
import { Args, Query, Resolver } from "@nestjs/graphql";
import { CurrentUser, type Principal } from "../authentication/index.js";
import { PageArgs, PagePipe } from "../graphql/index.js";
import { Badge } from "./badges.model.js";
import { BadgesService } from "./badges.service.js";
@Resolver(() => Badge)
export class BadgesResolver {
  constructor(private readonly service: BadgesService) {}
  @Query(() => [Badge])
  badges(
    @CurrentUser() user: Principal,
    @Args("organizationId", { type: () => String }, new ParseUUIDPipe())
    organizationId: string,
    @Args(new PagePipe()) page: PageArgs,
  ) {
    return this.service.list(user.loginName, organizationId, page);
  }
}
