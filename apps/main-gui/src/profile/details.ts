import type { FC } from "react";
import GithubIcon from "@/shared/icons/GithubIcon";
import type IconProps from "@/shared/icons/IconProps";
import LinkedInIcon from "@/shared/icons/LinkedInIcon";
import TwitterIcon from "@/shared/icons/TwitterIcon";
import type { Profile } from "./profile-schema";

/*
 * What the profile page shows that nothing serves yet.
 *
 * The profile itself is real now -- it is read and written through
 * `profile-api.tsx` -- so what is left here is the two blocks nothing counts
 * or records: the tallies under the name, and the skill bars. They stay in
 * one file so that the day there is a query for either, this is what stops
 * being imported.
 */

/* Points, badges and certificates, because those are what this product keeps
 * -- not the mock-up's followers and posts. None of the three is counted
 * anywhere yet: dbo.UserTallies holds points, and the badge tables hold
 * badges, but neither is asked for here. */
export const placeholderTallies = [
  { label: "Points", value: "12,480" },
  { label: "Badges", value: "37" },
  { label: "Certificates", value: "6" },
] as const;

/* One figure each rather than a series of anything, so they are all drawn in
 * the same gradient every other progress bar in the app uses. Four different
 * colours would say these four are being compared. */
export const placeholderSkills = [
  { label: "Programme design", percent: 82 },
  { label: "Facilitation", percent: 68 },
  { label: "Data literacy", percent: 74 },
  { label: "Community building", percent: 55 },
] as const;

export interface ProfileLink {
  label: string;
  handle: string;
  href: string;
  icon: FC<IconProps>;
}

/* The links the saved profile actually carries, in a fixed order, skipping
 * the ones left empty. A handle is stored the way it was typed -- with or
 * without a scheme -- so the href adds one when it has to. */
export function linksOf(profile: Profile): readonly ProfileLink[] {
  const candidates: { label: string; handle: string; icon: FC<IconProps> }[] = [
    { label: "GitHub", handle: profile.Github, icon: GithubIcon },
    { label: "Twitter", handle: profile.Twitter, icon: TwitterIcon },
    { label: "LinkedIn", handle: profile.LinkedIn, icon: LinkedInIcon },
  ];

  return candidates
    .filter((candidate) => candidate.handle !== "")
    .map((candidate) => ({
      ...candidate,
      href: /^https?:\/\//i.test(candidate.handle)
        ? candidate.handle
        : `https://${candidate.handle}`,
    }));
}
