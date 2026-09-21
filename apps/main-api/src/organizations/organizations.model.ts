import {
  Field,
  ObjectType,
  ID,
  Int,
  GraphQLISODateTime,
} from "@nestjs/graphql";

@ObjectType()
export class Organization {
  @Field(() => ID)
  OrganizationUUID!: string;
  @Field(() => String)
  Name!: string;
  @Field(() => Int)
  TeamCount!: number;
  @Field(() => Int)
  UserCount!: number;
  @Field(() => Int)
  OwnerCount!: number;
  @Field(() => Boolean, { nullable: true })
  IsOwner!: boolean | null;
  // False means archived: still there, still yours, filtered out of every
  // other read until it is restored. Reported by every operation that returns
  // an organization, so a row means the same thing wherever it came from.
  @Field(() => Boolean)
  IsEnabled!: boolean;
}

// Somebody's place in an organization. "IsOwner" is the whole role model --
// there are only two, and dbo.SetOrganizationRole moves a member between them.
@ObjectType()
export class OrganizationMember {
  @Field(() => ID)
  UserUUID!: string;
  @Field(() => String)
  Name!: string;
  @Field(() => String)
  LoginName!: string;
  @Field(() => String, { nullable: true })
  Email!: string | null;
  @Field(() => Boolean)
  IsOwner!: boolean;
  @Field(() => GraphQLISODateTime)
  JoinedAt!: Date;
}
