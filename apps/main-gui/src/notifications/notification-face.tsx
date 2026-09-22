import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import type { Theme } from "@mui/material/styles";
import { InitialsAvatar } from "../avatar";
import { kindOf } from "./notification-kinds";
import type { Notification } from "./notifications-api";

/*
 * The circle at the front of a notification, in the panel and on the page.
 *
 * A notification somebody caused shows that person, the way the mock-up does,
 * with the kind of notification as a small disc on the corner -- the face
 * answers "who" and the disc answers "what", and neither has to be read to get
 * the other. A notification nobody caused has no face to show, so the kind
 * fills the circle instead. That is most of them: a task falls overdue on its
 * own, a level is reached by the person being told, an update ships.
 *
 * Always `aria-hidden`. Everything it draws is said in words by the row it
 * sits in, and a screen reader reading it twice would be worse than not
 * reading it at all.
 */
export function NotificationFace({
  notification,
  size = 44,
}: {
  notification: Notification;
  size?: number;
}) {
  const { Icon, tint } = kindOf(notification.NotificationType);

  const disc = (across: number) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: across,
    height: across,
    borderRadius: "50%",
    color: (theme: Theme) => theme.palette.brand.card,
    backgroundColor: (theme: Theme) => theme.palette.brand.noticeTints[tint],
  });

  if (!notification.ActorName)
    return (
      <Box aria-hidden sx={{ flex: "0 0 auto", ...disc(size) }}>
        <Icon size={Math.round(size * 0.48)} />
      </Box>
    );

  return (
    <Badge
      aria-hidden
      overlap="circular"
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      badgeContent={
        <Box
          sx={{
            ...disc(Math.round(size * 0.45)),
            /* A ring of the row's own paper, so the disc reads as sitting on
             * top of the face rather than cut out of it. */
            border: (theme) => `2px solid ${theme.palette.brand.card}`,
            boxSizing: "content-box",
          }}
        >
          <Icon size={Math.round(size * 0.27)} />
        </Box>
      }
      sx={{ flex: "0 0 auto" }}
    >
      <InitialsAvatar
        name={notification.ActorName}
        size={size}
        fontSize={`${(size * 0.022).toFixed(2)}rem`}
      />
    </Badge>
  );
}
