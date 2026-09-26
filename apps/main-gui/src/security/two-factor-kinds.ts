import type { ComponentType } from "react";
import LinkIcon from "@/shared/icons/LinkIcon";
import MobileIcon from "@/shared/icons/MobileIcon";
import PhoneIcon from "@/shared/icons/PhoneIcon";

/*
 * Which mark stands for a kind of second factor.
 *
 * A lookup with a fallback, the same arrangement `sso-kinds.ts` has for a
 * login provider and `activity-kinds.ts` has for an event type, and for the
 * same reason: an API newer than this bundle can answer with a kind it has
 * never heard of, and a row with no mark on it is better than no row.
 *
 * The two marks say what the thing physically is rather than what it does: an
 * authenticator app is a screen in your hand, and an SMS is a call to a
 * number. Nothing else about a kind is in here -- what it is called and
 * whether this product recommends it both come from the API, because a second
 * client must not be able to disagree about which factor is the weaker one.
 */

export interface TwoFactorKind {
  /* Destructured at the call site and rendered from there, the way
   * `sso-kinds.ts` hands one over: `const { Icon } = kindOf(kind)`. */
  Icon: ComponentType<{ color?: string; size?: number }>;
}

const KINDS: Record<string, TwoFactorKind> = {
  "authenticator-app": { Icon: MobileIcon },
  sms: { Icon: PhoneIcon },
};

/* A chain link for a kind this bundle has no mark for, which says the one
 * true thing about it: it is something attached to the account. */
export function kindOf(kind: string): TwoFactorKind {
  return KINDS[kind] ?? { Icon: LinkIcon };
}
