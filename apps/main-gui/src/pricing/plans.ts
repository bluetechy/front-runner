/*
 * What each plan costs and what it opens up. The feature lines are drawn from
 * the schema in apps/main-db -- point currencies with their own expiry and
 * reset rules, badge criteria that fire from events, transfers with daily and
 * monthly limits, redemptions, approval stages, the event log -- so a line
 * here names something the product can be built to do rather than something
 * invented for a card.
 *
 * Prices are per month in US dollars. Paying for a year costs a fifth less,
 * which is applied here rather than written into each plan, so the discount
 * is one number to change.
 */

export const ANNUAL_DISCOUNT = 0.2;

export type Billing = "monthly" | "annual";

export type AudienceId = "individual" | "business";

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  /* Dollars a month, billed monthly. null when the price is a conversation. */
  monthlyPrice: number | null;
  /* What a month is bought for: the whole account, or each member of it. */
  unit: "account" | "member";
  /* The plan whose list this one starts from, named above its own features. */
  inherits?: string;
  callToAction: string;
  /* Enterprise is the one plan you cannot start on your own. */
  contactSales?: boolean;
  /* The one card drawn forward. At most one per audience. */
  featured?: boolean;
  features: readonly string[];
}

export interface Audience {
  id: AudienceId;
  label: string;
  /* Sits under the segmented control, saying who the row below is for. */
  summary: string;
  plans: readonly Plan[];
}

/* A tuple rather than an array: there are two audiences and the page shows
 * one of them at a time, so the first is somewhere to start from. */
export const audiences: readonly [Audience, Audience] = [
  {
    id: "individual",
    label: "Individual",
    summary:
      "For one person running a program — a club, a class, a team you look after.",
    plans: [
      {
        id: "free",
        name: "Free",
        tagline: "Enough to keep a real scoreboard for a small group.",
        monthlyPrice: 0,
        unit: "account",
        callToAction: "Get started",
        features: [
          "One organization, up to 5 members",
          "One point currency, with levels and a leaderboard",
          "Up to 10 badges, awarded by hand",
          "Tasks, checklists and labels",
          "An activity feed and in-app notifications",
          "30 days of point history",
        ],
      },
      {
        id: "plus",
        name: "Plus",
        tagline: "For a program the people in it have started to care about.",
        monthlyPrice: 19,
        unit: "account",
        inherits: "Free",
        callToAction: "Start with Plus",
        featured: true,
        features: [
          "Up to 25 members, across as many teams as you like",
          "Five point currencies, each with its own expiry and reset rules",
          "Unlimited badges, in categories and groups",
          "Badge criteria that award automatically from events",
          "Point multipliers for a launch week or an end-of-quarter push",
          "Roadmaps, task dependencies and file attachments",
          "Surveys, and points for answering them",
          "12 months of point history",
        ],
      },
      {
        id: "pro",
        name: "Pro",
        tagline: "The whole model, with nothing switched off.",
        monthlyPrice: 99,
        unit: "account",
        inherits: "Plus",
        callToAction: "Start with Pro",
        features: [
          "Unlimited members, teams and point currencies",
          "Point transfers between members, with daily and monthly limits",
          "A reward catalogue: redemptions, with per-member spend limits",
          "Approval workflows, with stages and delegated approvers",
          "A badge review queue, with reviewer comments",
          "Badge statistics: who has earned what, and how recently",
          "Full GraphQL API access",
          "Unlimited history, and event log export",
          "Priority support",
        ],
      },
    ],
  },
  {
    id: "business",
    label: "Business",
    summary: "For an organization where more than one person runs the program.",
    plans: [
      {
        id: "team",
        name: "Team",
        tagline: "The same program, with several people behind it.",
        monthlyPrice: 29,
        unit: "member",
        inherits: "Pro",
        callToAction: "Start with Team",
        featured: true,
        features: [
          "Per-member billing — add and remove people as the year goes",
          "Several organizations under one account",
          "Named roles, and permissions down to a single task",
          "Invitations an owner sends and the invitee accepts",
          "Google, Apple and Facebook sign-in",
          "An admin console over the full audit trail",
          "Onboarding help, and email support inside one business day",
        ],
      },
      {
        id: "enterprise",
        name: "Enterprise",
        tagline: "For a program that has to pass a security review.",
        monthlyPrice: null,
        unit: "member",
        inherits: "Team",
        callToAction: "Contact sales",
        contactSales: true,
        features: [
          "Single sign-on against your own identity provider, by SAML or OIDC",
          "SCIM provisioning and directory sync",
          "Multi-stage approval workflows with permissions of your own",
          "Data residency, a retention policy you set, and audit log streaming",
          "A single-tenant deployment, hosted by us or by you",
          "A 99.9% uptime commitment",
          "A named account manager and a technical onboarding plan",
          "Security review, a DPA, and terms your counsel has read",
        ],
      },
    ],
  },
];

/* Dollars a month under the chosen cadence, rounded to the cent. Both of
 * these take the monthly price rather than the plan, so the plan whose price
 * is a conversation is handled once, where it is displayed, instead of every
 * function here having a null to carry. */
export function monthlyRate(monthlyPrice: number, billing: Billing): number {
  if (billing === "monthly") return monthlyPrice;
  return Math.round(monthlyPrice * (1 - ANNUAL_DISCOUNT) * 100) / 100;
}

/* What a year of the plan is charged as, in one payment. */
export function annualTotal(monthlyPrice: number): number {
  return Math.round(monthlyRate(monthlyPrice, "annual") * 12 * 100) / 100;
}

/* "19" where the cents are nothing, "15.20" where they are not. The big
 * price on a card sets its dollar sign as a separate, smaller span, because
 * Playfair's is a tall glyph that overshoots the numerals beside it. */
export function amountOf(value: number): string {
  return value % 1 === 0 ? String(value) : value.toFixed(2);
}

/* The same figure with its sign attached, for prices set in running text. */
export function money(value: number): string {
  return `$${amountOf(value)}`;
}

/* The discount as the page says it out loud. */
export const percentOff = `${Math.round(ANNUAL_DISCOUNT * 100)}%`;
