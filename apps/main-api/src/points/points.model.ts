import { Field, ObjectType, ID, GraphQLISODateTime } from "@nestjs/graphql";

@ObjectType()
export class Point {
  @Field(() => ID)
  UserPointUUID!: string;
  @Field(() => ID)
  UserUUID!: string;
  @Field(() => ID)
  OrganizationUUID!: string;
  @Field(() => ID)
  PointUUID!: string;
  @Field(() => String)
  Name!: string;
  @Field(() => String)
  Description!: string;
  @Field(() => String)
  Amount!: string;
  @Field(() => GraphQLISODateTime, { nullable: true })
  ExpiresAt!: Date | null;
}
