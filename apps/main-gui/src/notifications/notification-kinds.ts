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
 * The tints are named for what a notification is about, not for a colour --
 * see `design-system/theme.ts`. Two types sharing one is the point: a badge
 * and a level are both the programme rewarding you, and they look it.
 */

type Tint = keyof Theme["palette"]["brand"]["noticeTints"];

export interface NotificationKind {
  Icon: FC<IconProps>;
  tint: Tint;
}

const KINDS: Record<string, NotificationKind> = {
  Assigned: { Icon: TaskIcon, tint: "task" },
  Overdue: { Icon: OverdueIcon, tint: "alert" },
  ApprovalNeeded: { Icon: ApprovalIcon, tint: "alert" },
  Rejected: { Icon: RejectedIcon, tint: "alert" },
  BadgeEarned: { Icon: AchievementsIcon, tint: "reward" },
  LevelReached: { Icon: LevelIcon, tint: "reward" },
  OrderReceived: { Icon: ItemsSoldIcon, tint: "commerce" },
  ReviewReceived: { Icon: MailIcon, tint: "message" },
  Mention: { Icon: MentionIcon, tint: "message" },
  Registrations: { Icon: CustomersIcon, tint: "people" },
  Welcome: { Icon: CustomersIcon, tint: "people" },
  UpdateAvailable: { Icon: UpdateIcon, tint: "general" },
};

/* What a type nobody has drawn yet gets: the bell itself, on the quietest
 * tint. It is deliberately the same shape as the button the menu hangs off,
 * which reads as "a notification" and nothing more specific. */
const UNKNOWN: NotificationKind = { Icon: BellIcon, tint: "general" };

export function kindOf(notificationType: string): NotificationKind {
  return KINDS[notificationType] ?? UNKNOWN;
}
