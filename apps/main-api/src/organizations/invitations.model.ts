import { Field, ObjectType, ID, GraphQLISODateTime } from '@nestjs/graphql';

// An offer of membership, from either side of it: an owner reading what their
// organization has issued, or a user reading what is waiting for them. The
// shape is the same because dbo.GetInvitation is the one projection behind
// every invitation function.
@ObjectType()
export class OrganizationInvitation {
  @Field(() => ID)
  InvitationUUID!: string;
  @Field(() => ID)
  OrganizationUUID!: string;
  @Field(() => String)
  OrganizationName!: string;
  @Field(() => String)
  Email!: string;
  @Field(() => Boolean)
  IsOwner!: boolean;
  @Field(() => String)
  Status!: string;
  @Field(() => GraphQLISODateTime)
  ExpiresAt!: Date;
  @Field(() => GraphQLISODateTime, { nullable: true })
  RespondedAt!: Date | null;
  @Field(() => String)
  InvitedByLoginName!: string;
}
