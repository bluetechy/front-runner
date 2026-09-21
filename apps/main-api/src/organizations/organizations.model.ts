import { Field, ObjectType, ID, Int, GraphQLISODateTime } from '@nestjs/graphql';

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
}
