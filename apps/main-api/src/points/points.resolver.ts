import { ParseUUIDPipe } from "@nestjs/common";
import { Args, Query, Resolver } from "@nestjs/graphql";
import { CurrentUser, type Principal } from "../authentication/index.js";
import { PageArgs, PagePipe } from "../graphql/index.js";
import { Point } from "./points.model.js";
import { PointsService } from "./points.service.js";
@Resolver(() => Point)
export class PointsResolver {
  constructor(private readonly service: PointsService) {}
  @Query(() => [Point])
  points(
    @CurrentUser() user: Principal,
    @Args("organizationId", { type: () => String }, new ParseUUIDPipe())
    organizationId: string,
    @Args(new PagePipe()) page: PageArgs,
  ) {
    return this.service.list(user.loginName, organizationId, page);
  }
}
