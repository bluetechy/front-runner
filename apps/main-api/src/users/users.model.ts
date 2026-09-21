import { Field, ObjectType, ID } from '@nestjs/graphql';

// No token field. Keycloak issues the access token straight to the browser, so
// this API never mints, refreshes or hands one back -- it only verifies the
// one it is given.
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
  @Field(() => Boolean, { nullable: true })
  IsAdmin!: boolean | null;
}
