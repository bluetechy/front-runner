import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { CurrentUser, type Principal } from "../authentication/index.js";
import { ZodPipe } from "../graphql/index.js";
import { UserProfile, UserProfileInput } from "./profiles.model.js";
import { profileSchema, type ProfileInput } from "./profiles.schema.js";
import { ProfilesService } from "./profiles.service.js";

// Your own profile, and nothing else: neither operation takes a user, because
// there is nobody else's profile to ask for yet. Reading somebody else's is a
// different query with a different authorization question behind it.
@Resolver(() => UserProfile)
export class ProfilesResolver {
  constructor(private readonly service: ProfilesService) {}

  @Query(() => UserProfile, { nullable: true })
  profile(@CurrentUser() user: Principal) {
    return this.service.get(user.loginName);
  }

  @Mutation(() => UserProfile, { nullable: true })
  updateProfile(
    @CurrentUser() user: Principal,
    @Args(
      "profile",
      { type: () => UserProfileInput },
      new ZodPipe(profileSchema),
    )
    profile: ProfileInput,
  ) {
    return this.service.set(user.loginName, profile);
  }
}
