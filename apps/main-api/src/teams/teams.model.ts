import { Field, ObjectType, ID, Int, GraphQLISODateTime } from '@nestjs/graphql';

@ObjectType()
export class Team {
  @Field(() => ID)
  OrganizationUUID!: string;
  @Field(() => ID)
  TeamUUID!: string;
  @Field(() => String)
  Name!: string;
  @Field(() => Int)
  UserCount!: number;
  @Field(() => Boolean, { nullable: true })
  IsManager!: boolean | null;
}
