import Box from "@mui/material/Box";
import ListItemButton from "@mui/material/ListItemButton";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../language";
import { kindOf } from "./notification-kinds";
import { relativeTime } from "./relative-time";
import { isUnread, type Notification } from "./notifications-api";

/*
 * One line of the bell's menu: a disc with a glyph on it, what happened, and
 * how long ago.
 *
 * The row is a button and the whole of it is the target, because there is one
 * thing to do with a notification and it is "I have seen this". There is no
 * chevron: the mock-up draws one, and it would point at a page that does not
 * exist -- an affordance that lies is worse than one that is missing. When a
 * notification has somewhere to go, the chevron comes back with it.
 *
 * Unread is carried three ways on purpose. The tinted ground and the dot are
 * for the eye, the weight of the text is for a glance across the list, and the
 * label is for a screen reader, which sees none of the other two.
 */
export function NotificationRow({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (notificationId: string) => void;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { Icon, tint } = kindOf(notification.NotificationType);
  const unread = isUnread(notification);

  return (
    <ListItemButton
      component="button"
      onClick={() => {
        if (unread) onRead(notification.NotificationUUID);
      }}
      aria-label={
        unread
          ? t("{{message}} — unread. Mark as read.", {
              message: notification.Message,
            })
          : notification.Message
      }
      sx={{
        width: "100%",
        gap: 1.5,
        paddingInline: "1rem",
        paddingBlock: "0.85rem",
        textAlign: "left",
        border: "none",
        borderBottom: (theme) => `1px solid ${theme.palette.brand.cardRule}`,
        backgroundColor: (theme) =>
          unread ? theme.palette.brand.cardTint : "transparent",
        "&:hover": {
          backgroundColor: (theme) => theme.palette.brand.cardField,
        },
      }}
    >
      <Box
        aria-hidden
        sx={{
          display: "flex",
          flex: "0 0 auto",
          alignItems: "center",
          justifyContent: "center",
          width: 42,
          height: 42,
          borderRadius: "50%",
          color: (theme) => theme.palette.brand.card,
          backgroundColor: (theme) => theme.palette.brand.noticeTints[tint],
        }}
      >
        <Icon size={20} />
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontSize: "0.9rem",
            fontWeight: unread ? 600 : 500,
            lineHeight: 1.4,
            color: (theme) => theme.palette.brand.cardInk,
          }}
        >
          {notification.Message}
        </Typography>
        <Typography
          sx={{
            fontSize: "0.78rem",
            lineHeight: 1.6,
            color: (theme) => theme.palette.brand.cardInkMuted,
          }}
        >
          {relativeTime(notification.CreatedAt, language.tag)}
        </Typography>
      </Box>

      {unread && (
        <Box
          aria-hidden
          sx={{
            flex: "0 0 auto",
            width: 9,
            height: 9,
            borderRadius: "50%",
            backgroundColor: "primary.main",
          }}
        />
      )}
    </ListItemButton>
  );
}
