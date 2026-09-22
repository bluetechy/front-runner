import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { ProfilesResolver } from "./profiles.resolver.js";
import { ProfilesService } from "./profiles.service.js";
import type { ProfileInput } from "./profiles.schema.js";

/*
 * Your own profile and nothing else: neither operation takes a user, because
 * there is nobody else's profile to ask for yet. That is not a convenience --
 * it is the reason neither of them needs an authorization question of its
 * own beyond being signed in.
 */

const user = { userId: "user-id", loginName: "alice" };

const profile = {
  FirstName: "Marcus",
  LastName: "Member",
} as unknown as ProfileInput;

function setup() {
  const service = {
    get: jest.fn().mockReturnValue("alice's profile"),
    set: jest.fn().mockReturnValue("alice's saved profile"),
  };
  return {
    service,
    resolver: new ProfilesResolver(service as unknown as ProfilesService),
  };
}

describe("the profile operations", () => {
  it("reads the profile of the account the token names", () => {
    const { resolver, service } = setup();

    expect(resolver.profile(user)).toBe("alice's profile");
    expect(service.get).toHaveBeenCalledWith("alice");
  });

  it("writes the profile of the account the token names", () => {
    const { resolver, service } = setup();

    expect(resolver.updateProfile(user, profile)).toBe("alice's saved profile");
    expect(service.set).toHaveBeenCalledWith("alice", profile);
  });

  // Neither signature has a user in it. If one ever grows one, it needs an
  // answer to "may I read yours?" that this API does not have today.
  it("takes no argument naming whose profile it is", () => {
    expect(ProfilesResolver.prototype.profile).toHaveLength(1);
    expect(ProfilesResolver.prototype.updateProfile).toHaveLength(2);
  });
});
