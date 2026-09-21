import { Field, ObjectType, ID, Int, GraphQLISODateTime } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => ID)
  UserUUID!: string;
  @Field(() => String)
  Name!: string;
  @Field(() => String)
  LoginName!: string;
  @Field(() => String, { nullable: true })
  Email!: string | null;
  @Field(() => String, { nullable: true })
  Token!: string | null;
  @Field(() => Boolean, { nullable: true })
  IsAdmin!: boolean | null;
}
