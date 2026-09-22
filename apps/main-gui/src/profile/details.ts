import type { FC } from "react";
import GithubIcon from "@/shared/icons/GithubIcon";
import type IconProps from "@/shared/icons/IconProps";
import LinkedInIcon from "@/shared/icons/LinkedInIcon";
import LocationIcon from "@/shared/icons/LocationIcon";
import MobileIcon from "@/shared/icons/MobileIcon";
import PortfolioIcon from "@/shared/icons/PortfolioIcon";
import SlackIcon from "@/shared/icons/SlackIcon";
import TwitterIcon from "@/shared/icons/TwitterIcon";

/*
 * Everything the profile page shows that nothing serves yet.
 *
 * The session knows a name, a login name and an email address, and the `me`
 * query adds an admin flag; a bio, a photograph, links, skills and a phone
 * number are none of them. So they live here, in one file, the way the
 * dashboard's figures live in `dashboard/metrics.ts` -- when there is a
 * profile to read and write, this is the file the page stops reading from.
 */

/* What the person is here as. The rail shows it under their name too, so it
 * is one constant rather than two that have to be kept saying the same
 * thing. The nearest real thing the API has is the account's admin flag. */
export const placeholderPosition = "Programme manager";

export const placeholderBio =
  "Runs the points, badges and levels behind a programme of about four " +
  "hundred people. Spends most of the week on what the scoreboard rewards " +
  "and why, and the rest of it explaining to people why their streak reset. " +
  "Believes a leaderboard nobody argues with is a leaderboard nobody reads.";

/* The three figures under the name. Points, badges and certificates, because
 * those are what this product keeps -- not followers and posts. */
export const placeholderTallies = [
  { label: "Points", value: "12,480" },
  { label: "Badges", value: "37" },
  { label: "Certificates", value: "6" },
] as const;

export interface ProfileLink {
  label: string;
  handle: string;
  href: string;
  icon: FC<IconProps>;
}

export const placeholderLinks: readonly ProfileLink[] = [
  {
    label: "GitHub",
    handle: "github.com/testuser",
    href: "https://github.com/testuser",
    icon: GithubIcon,
  },
  {
    label: "Twitter",
    handle: "twitter.com/testuser",
    href: "https://twitter.com/testuser",
    icon: TwitterIcon,
  },
  {
    label: "LinkedIn",
    handle: "linkedin.com/in/testuser",
    href: "https://www.linkedin.com/in/testuser",
    icon: LinkedInIcon,
  },
  {
    label: "Portfolio",
    handle: "testuser.example",
    href: "https://testuser.example",
    icon: PortfolioIcon,
  },
];

/* The bars are one figure each rather than a series of anything, so they are
 * all drawn in the same gradient every other progress bar in the app uses.
 * Four different colours here would say these four are being compared. */
export const placeholderSkills = [
  { label: "Programme design", percent: 82 },
  { label: "Facilitation", percent: 68 },
  { label: "Data literacy", percent: 74 },
  { label: "Community building", percent: 55 },
] as const;

export interface ContactLine {
  label: string;
  value: string;
  icon: FC<IconProps>;
}

export const placeholderContact: readonly ContactLine[] = [
  { label: "Mobile", value: "+1 555 0134", icon: MobileIcon },
  { label: "Slack", value: "@testuser", icon: SlackIcon },
  { label: "Current address", value: "San Francisco, CA", icon: LocationIcon },
];

/* What the form offers under Language. Nothing reads it yet. */
export const languages = [
  "US English",
  "British English",
  "Español",
  "Français",
] as const;
