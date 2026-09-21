import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, type Principal } from '../authentication/index.js';
import { PageArgs, PagePipe, EmailPipe } from '../graphql/index.js';
import { OrganizationInvitation } from './invitations.model.js';
import { InvitationsService } from './invitations.service.js';

@Resolver(() => OrganizationInvitation)
export class InvitationsResolver {
  constructor(private readonly service: InvitationsService) {}

  // What is waiting for the caller to answer.
  @Query(() => [OrganizationInvitation])
  invitations(
    @CurrentUser() user: Principal,
    @Args(new PagePipe()) page: PageArgs,
  ) { return this.service.mine(user.loginName, page); }

  // What an organization has issued. Owners only, refused in the database.
  @Query(() => [OrganizationInvitation])
  organizationInvitations(
    @CurrentUser() user: Principal,
    @Args('organizationId', { type: () => String }, new ParseUUIDPipe()) organizationId: string,
    @Args(new PagePipe()) page: PageArgs,
  ) { return this.service.forOrganization(user.loginName, organizationId, page); }

  @Mutation(() => OrganizationInvitation, { nullable: true })
  inviteToOrganization(
    @CurrentUser() user: Principal,
    @Args('organizationId', { type: () => String }, new ParseUUIDPipe()) organizationId: string,
    @Args('email', { type: () => String }, new EmailPipe()) email: string,
    @Args('isOwner', { type: () => Boolean, defaultValue: false }) isOwner: boolean,
  ) { return this.service.invite(user.loginName, organizationId, email, isOwner); }

  @Mutation(() => OrganizationInvitation, { nullable: true })
  acceptInvitation(
    @CurrentUser() user: Principal,
    @Args('invitationId', { type: () => String }, new ParseUUIDPipe()) invitationId: string,
  ) { return this.service.accept(user.loginName, invitationId); }

  @Mutation(() => OrganizationInvitation, { nullable: true })
  declineInvitation(
    @CurrentUser() user: Principal,
    @Args('invitationId', { type: () => String }, new ParseUUIDPipe()) invitationId: string,
  ) { return this.service.decline(user.loginName, invitationId); }

  @Mutation(() => OrganizationInvitation, { nullable: true })
  revokeInvitation(
    @CurrentUser() user: Principal,
    @Args('invitationId', { type: () => String }, new ParseUUIDPipe()) invitationId: string,
  ) { return this.service.revoke(user.loginName, invitationId); }
}
