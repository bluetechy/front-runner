import { ParseUUIDPipe } from "@nestjs/common";
import { Args, Query, Resolver } from "@nestjs/graphql";
import { CurrentUser, type Principal } from "../authentication/index.js";
import { PageArgs, PagePipe } from "../graphql/index.js";
import { Tally } from "./tallies.model.js";
import { TalliesService } from "./tallies.service.js";
@Resolver(() => Tally)
export class TalliesResolver {
  constructor(private readonly service: TalliesService) {}
  @Query(() => [Tally])
  tallies(
    @CurrentUser() user: Principal,
    @Args("organizationId", { type: () => String }, new ParseUUIDPipe())
    organizationId: string,
    @Args(new PagePipe()) page: PageArgs,
  ) {
    return this.service.list(user.loginName, organizationId, page);
  }
}
