import { Field, ObjectType, ID, Int, GraphQLISODateTime } from '@nestjs/graphql';

@ObjectType()
export class Badge {
  @Field(() => ID)
  UserUUID!: string;
  @Field(() => ID)
  OrganizationUUID!: string;
  @Field(() => ID)
  BadgeUUID!: string;
  @Field(() => String)
  Name!: string;
  @Field(() => String, { nullable: true })
  Description!: string | null;
  @Field(() => Int)
  Level!: number;
  @Field(() => GraphQLISODateTime, { nullable: true })
  EarnedAt!: Date | null;
  @Field(() => String, { nullable: true })
  EarnedDescription!: string | null;
}
