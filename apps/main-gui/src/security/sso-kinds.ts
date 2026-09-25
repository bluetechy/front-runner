import type { ComponentType } from "react";
import AppleIcon from "@/shared/icons/AppleIcon";
import FacebookIcon from "@/shared/icons/FacebookIcon";
import GoogleIcon from "@/shared/icons/GoogleIcon";
import LinkIcon from "@/shared/icons/LinkIcon";

/*
 * Which mark stands for a login provider.
 *
 * The realm decides which providers exist, so this is a lookup with a fallback
 * rather than a list to draw from -- the same arrangement `activity-kinds.ts`
 * has for an event type and `notification-kinds.ts` has for a notification,
 * and for the same reason: an API newer than this bundle can answer with a
 * provider it has never heard of, and a row with no mark on it is better than
 * no row.
 *
 * The three that are known are the three on the login card, and the marks are
 * the same ones: somebody who logged in with the Google button should meet the
 * Google button's mark on the page that says so.
 *
 * Nothing else about a provider is in here. What it is called comes from the
 * realm, because that is where it was named, and the sentence under the name
 * is composed from that name where the row is drawn. A table of English per
 * provider would be three sentences to keep in step and a fourth to write
 * every time a realm gained one.
 */

export interface ProviderKind {
  /* Destructured at the call site and rendered from there, the way
   * `notification-kinds.ts` hands one over: `const { Icon } = kindOf(alias)`. */
  Icon: ComponentType<{ color?: string; size?: number }>;
}

const KINDS: Record<string, ProviderKind> = {
  google: { Icon: GoogleIcon },
  facebook: { Icon: FacebookIcon },
  apple: { Icon: AppleIcon },
};

/* A chain link for a provider this bundle has no mark for, which says the one
 * true thing about it: it is something an account can be connected to. */
export function kindOf(alias: string): ProviderKind {
  return KINDS[alias] ?? { Icon: LinkIcon };
}
