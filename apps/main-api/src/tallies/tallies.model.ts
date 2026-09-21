import { Field, ObjectType, ID } from "@nestjs/graphql";

@ObjectType()
export class Tally {
  @Field(() => ID)
  OrganizationUUID!: string;
  @Field(() => ID)
  UserUUID!: string;
  @Field(() => String)
  Name!: string;
  @Field(() => ID)
  PointUUID!: string;
  @Field(() => String)
  Amount!: string;
}
