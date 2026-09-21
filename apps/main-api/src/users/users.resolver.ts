import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, Public, type Principal } from '../authentication/index.js';
import { PageArgs, PagePipe } from '../graphql/index.js';
import { User } from './users.model.js';
import { UsersService } from './users.service.js';
@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly service: UsersService) {}
  @Query(() => User, { nullable: true })
  me(@CurrentUser() user: Principal) { return this.service.me(user.loginName); }
  @Query(() => [User])
  users(@CurrentUser() user: Principal, @Args(new PagePipe()) page: PageArgs) { return this.service.list(user.loginName, page); }
  @Public()
  @Mutation(() => User)
  login(@Args('value', { type: () => String }) value: string) { return this.service.login(value); }
}
