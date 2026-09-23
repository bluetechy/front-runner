import type { Theme } from "@mui/material/styles";
import type { FC } from "react";
import AchievementsIcon from "@/shared/icons/AchievementsIcon";
import ApprovalIcon from "@/shared/icons/ApprovalIcon";
import BellIcon from "@/shared/icons/BellIcon";
import CustomersIcon from "@/shared/icons/CustomersIcon";
import type IconProps from "@/shared/icons/IconProps";
import ItemsSoldIcon from "@/shared/icons/ItemsSoldIcon";
import LevelIcon from "@/shared/icons/LevelIcon";
import MailIcon from "@/shared/icons/MailIcon";
import MentionIcon from "@/shared/icons/MentionIcon";
import OverdueIcon from "@/shared/icons/OverdueIcon";
import RejectedIcon from "@/shared/icons/RejectedIcon";
import TaskIcon from "@/shared/icons/TaskIcon";
import UpdateIcon from "@/shared/icons/UpdateIcon";

/*
 * What a notification looks like in the menu: the glyph on its disc, and which
 * of the theme's tints the disc is painted in.
 *
 * `NotificationType` is free text in the database rather than an enum, because
 * the list of things worth telling somebody grows with the product. That is
 * the reason this table exists and the reason it has a fallback: a type
 * shipped by an API that is newer than this bundle draws the bell on the
 * quietest tint rather than an empty circle.
 *
 * The tints are named for what a notification is about, not for a color --
 * see `design-system/theme.ts`. Two types sharing one is the point: a badge
 * and a level are both the program rewarding you, and they look it.
 */

type Tint = keyof Theme["palette"]["brand"]["noticeTints"];

export interface NotificationKind {
  Icon: FC<IconProps>;
  tint: Tint;
  /* What the chip on the page says. It is the English sentence, which is
   * also its key in `locales/*.json` -- the convention this app translates
   * by; see `language/i18n.ts`. */
  label: string;
}

const KINDS: Record<string, NotificationKind> = {
  Assigned: { Icon: TaskIcon, tint: "task", label: "Task" },
  Overdue: { Icon: OverdueIcon, tint: "alert", label: "Overdue" },
  ApprovalNeeded: { Icon: ApprovalIcon, tint: "alert", label: "Approval" },
  Rejected: { Icon: RejectedIcon, tint: "alert", label: "Rejected" },
  BadgeEarned: { Icon: AchievementsIcon, tint: "reward", label: "Badge" },
  LevelReached: { Icon: LevelIcon, tint: "reward", label: "Level" },
  OrderReceived: { Icon: ItemsSoldIcon, tint: "commerce", label: "Order" },
  ReviewReceived: { Icon: MailIcon, tint: "message", label: "Review" },
  Mention: { Icon: MentionIcon, tint: "message", label: "Mention" },
  Registrations: {
    Icon: CustomersIcon,
    tint: "people",
    label: "Registrations",
  },
  Welcome: { Icon: CustomersIcon, tint: "people", label: "Welcome" },
  UpdateAvailable: { Icon: UpdateIcon, tint: "general", label: "Update" },
};

/* What a type nobody has drawn yet gets: the bell itself, on the quietest
 * tint. It is deliberately the same shape as the button the menu hangs off,
 * which reads as "a notification" and nothing more specific.
 *
 * Its label is the type spaced out -- "PointsExpiring" becomes "Points
 * expiring" -- which is untranslated and legible, and is better than an empty
 * chip or the raw camel case. A type worth showing properly gets a row in the
 * table above. */
const UNKNOWN = { Icon: BellIcon, tint: "general" } as const;

export function kindOf(notificationType: string): NotificationKind {
  return (
    KINDS[notificationType] ?? { ...UNKNOWN, label: spaced(notificationType) }
  );
}

function spaced(notificationType: string): string {
  const words = notificationType.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}
