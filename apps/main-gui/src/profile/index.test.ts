import { describe, expect, it } from "vitest";
import * as profile from "./index";
import { Profile } from "./profile";
import { ProfileProvider, useProfile } from "./profile-api";

/*
 * The page, and the provider that holds the profile. The provider is public
 * because it is mounted by the `_app` route rather than by the page: the rail
 * shows the designation under somebody's name, and fetching the profile twice
 * would be two answers that can disagree.
 */

describe("what the profile vertical offers the rest of the app", () => {
  it("offers the page, the provider, and the hook that reads it", () => {
    expect(Object.keys(profile).toSorted()).toEqual([
      "Profile",
      "ProfileProvider",
      "useProfile",
    ]);
  });

  it("offers the things themselves rather than copies of them", () => {
    expect(profile.Profile).toBe(Profile);
    expect(profile.ProfileProvider).toBe(ProfileProvider);
    expect(profile.useProfile).toBe(useProfile);
  });

  it("keeps the form, the card and the schema to itself", () => {
    for (const inside of [
      "ProfileForm",
      "ProfileSummary",
      "CardField",
      "profileSchema",
      "linksOf",
    ])
      expect(Object.keys(profile)).not.toContain(inside);
  });
});
