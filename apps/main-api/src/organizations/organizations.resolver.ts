import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, type Principal } from '../authentication/index.js';
import { PageArgs, PagePipe, NamePipe } from '../graphql/index.js';
import { Organization } from './organizations.model.js';
import { OrganizationsService } from './organizations.service.js';
@Resolver(() => Organization)
export class OrganizationsResolver {
  constructor(private readonly service: OrganizationsService) {}
  @Query(() => [Organization])
  organizations(
    @CurrentUser() user: Principal,
    @Args(new PagePipe()) page: PageArgs,
  ) { return this.service.list(user.loginName, page); }
  @Mutation(() => Organization, { nullable: true })
  addOrganization(
    @CurrentUser() user: Principal,
    @Args('name', { type: () => String }, new NamePipe()) name: string,
  ) { return this.service.add(user.loginName, name); }

  @Mutation(() => Organization, { nullable: true })
  joinOrganization(
    @CurrentUser() user: Principal,
    @Args('organizationId', { type: () => String }, new ParseUUIDPipe()) organizationId: string,
    @Args('userId', { type: () => String }, new ParseUUIDPipe()) userId: string,
  ) { return this.service.join(user, organizationId, userId); }

  @Mutation(() => Organization, { nullable: true })
  leaveOrganization(
    @CurrentUser() user: Principal,
    @Args('organizationId', { type: () => String }, new ParseUUIDPipe()) organizationId: string,
    @Args('userId', { type: () => String }, new ParseUUIDPipe()) userId: string,
  ) { return this.service.leave(user, organizationId, userId); }
}
