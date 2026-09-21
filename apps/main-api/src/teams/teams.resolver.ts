import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, type Principal } from '../authentication/index.js';
import { PageArgs, PagePipe, NamePipe } from '../graphql/index.js';
import { Team } from './teams.model.js';
import { TeamsService } from './teams.service.js';
@Resolver(() => Team)
export class TeamsResolver {
  constructor(private readonly service: TeamsService) {}
  @Query(() => [Team])
  teams(
    @CurrentUser() user: Principal,
    @Args('organizationId', { type: () => String }, new ParseUUIDPipe()) organizationId: string,
    @Args(new PagePipe()) page: PageArgs,
  ) { return this.service.list(user.loginName, organizationId, page); }
  @Mutation(() => Team, { nullable: true })
  addTeam(
    @CurrentUser() user: Principal,
    @Args('organizationId', { type: () => String }, new ParseUUIDPipe()) organizationId: string,
    @Args('name', { type: () => String }, new NamePipe()) name: string,
  ) { return this.service.add(user.loginName, organizationId, name); }

  @Mutation(() => Team, { nullable: true })
  joinTeam(
    @CurrentUser() user: Principal,
    @Args('teamId', { type: () => String }, new ParseUUIDPipe()) teamId: string,
    @Args('userId', { type: () => String }, new ParseUUIDPipe()) userId: string,
  ) { return this.service.join(user, teamId, userId); }

  @Mutation(() => Team, { nullable: true })
  leaveTeam(
    @CurrentUser() user: Principal,
    @Args('teamId', { type: () => String }, new ParseUUIDPipe()) teamId: string,
    @Args('userId', { type: () => String }, new ParseUUIDPipe()) userId: string,
  ) { return this.service.leave(user, teamId, userId); }
}
