import { ParseUUIDPipe } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { CurrentUser, type Principal } from "../authentication/index.js";
import { PageArgs, PagePipe, NamePipe } from "../graphql/index.js";
import { Organization, OrganizationMember } from "./organizations.model.js";
import { OrganizationsService } from "./organizations.service.js";
@Resolver(() => Organization)
export class OrganizationsResolver {
  constructor(private readonly service: OrganizationsService) {}
  @Query(() => [Organization])
  organizations(
    @CurrentUser() user: Principal,
    @Args(new PagePipe()) page: PageArgs,
    // Archived organizations are out of the way by default; an owner needs
    // them back to restore one.
    @Args("includeArchived", { type: () => Boolean, defaultValue: false })
    includeArchived: boolean,
  ) {
    return this.service.list(user.loginName, page, includeArchived);
  }

  // One organization, for a detail view. Returns null rather than raising when
  // the caller does not belong to it -- an error would confirm it exists.
  @Query(() => Organization, { nullable: true })
  organization(
    @CurrentUser() user: Principal,
    @Args("organizationId", { type: () => String }, new ParseUUIDPipe())
    organizationId: string,
  ) {
    return this.service.get(user.loginName, organizationId);
  }
  @Mutation(() => Organization, { nullable: true })
  addOrganization(
    @CurrentUser() user: Principal,
    @Args("name", { type: () => String }, new NamePipe()) name: string,
  ) {
    return this.service.add(user.loginName, name);
  }

  // Readable by any member: knowing who else is in the organization is not an
  // administrative privilege, unlike knowing who has been invited.
  @Query(() => [OrganizationMember])
  organizationMembers(
    @CurrentUser() user: Principal,
    @Args("organizationId", { type: () => String }, new ParseUUIDPipe())
    organizationId: string,
    @Args(new PagePipe()) page: PageArgs,
  ) {
    return this.service.members(user.loginName, organizationId, page);
  }

  // Promote a member to owner or demote one back. This is how ownership is
  // handed over -- without it the last-owner guard on leaveOrganization has no
  // way out of it.
  @Mutation(() => OrganizationMember, { nullable: true })
  setOrganizationRole(
    @CurrentUser() user: Principal,
    @Args("organizationId", { type: () => String }, new ParseUUIDPipe())
    organizationId: string,
    @Args("userId", { type: () => String }, new ParseUUIDPipe()) userId: string,
    @Args("isOwner", { type: () => Boolean }) isOwner: boolean,
  ) {
    return this.service.setRole(
      user.loginName,
      organizationId,
      userId,
      isOwner,
    );
  }

  @Mutation(() => Organization, { nullable: true })
  renameOrganization(
    @CurrentUser() user: Principal,
    @Args("organizationId", { type: () => String }, new ParseUUIDPipe())
    organizationId: string,
    @Args("name", { type: () => String }, new NamePipe()) name: string,
  ) {
    return this.service.rename(user.loginName, organizationId, name);
  }

  // Archive or restore. Nothing is deleted: memberships, teams and point rows
  // all survive, and every read function starts or stops filtering it out.
  @Mutation(() => Organization, { nullable: true })
  setOrganizationEnabled(
    @CurrentUser() user: Principal,
    @Args("organizationId", { type: () => String }, new ParseUUIDPipe())
    organizationId: string,
    @Args("isEnabled", { type: () => Boolean }) isEnabled: boolean,
  ) {
    return this.service.setEnabled(user.loginName, organizationId, isEnabled);
  }

  @Mutation(() => Organization, { nullable: true })
  leaveOrganization(
    @CurrentUser() user: Principal,
    @Args("organizationId", { type: () => String }, new ParseUUIDPipe())
    organizationId: string,
    @Args("userId", { type: () => String }, new ParseUUIDPipe()) userId: string,
  ) {
    return this.service.leave(user, organizationId, userId);
  }
}
