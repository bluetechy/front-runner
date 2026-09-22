import Box from "@mui/material/Box";
import ListItemButton from "@mui/material/ListItemButton";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../language";
import { NotificationFace } from "./notification-face";
import { relativeTime } from "./relative-time";
import { isUnread, type Notification } from "./notifications-api";

/*
 * One line of the bell's panel: a face, what happened, how long ago, and
 * whether it has been read.
 *
 * The row is a button and the whole of it is the target, because there is one
 * thing to do with a notification and it is "I have seen this". There is no
 * chevron: the mock-up draws one, and it would point at a page that does not
 * exist -- an affordance that lies is worse than one that is missing. When a
 * notification has somewhere to go, the chevron comes back with it.
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
  const unread = isUnread(notification);

  return (
    <ListItemButton
      component="button"
      onClick={() => {
        if (unread) onRead(notification.NotificationUUID);
      }}
      aria-label={said(notification)}
      sx={{
        width: "100%",
        gap: 1.5,
        paddingInline: "1rem",
        paddingBlock: "0.8rem",
        textAlign: "left",
        border: "none",
        borderBottom: (theme) => `1px solid ${theme.palette.brand.cardRule}`,
        backgroundColor: "transparent",
        "&:hover": {
          backgroundColor: (theme) => theme.palette.brand.cardField,
        },
      }}
    >
      <NotificationFace notification={notification} />

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontSize: "0.9rem",
            lineHeight: 1.4,
            color: (theme) => theme.palette.brand.cardInk,
          }}
        >
          {/* The actor's name leads and is the only bold thing in the row, so
           * a list of them reads as a column of names with what each one did
           * beside it. The message is written to follow a name -- see the
           * seed -- and stands on its own where there is nobody. */}
          {notification.ActorName && (
            <Box component="span" sx={{ fontWeight: 700 }}>
              {notification.ActorName}{" "}
            </Box>
          )}
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

      {/* The read state, down the right-hand edge, where the eye can run down
       * one column rather than hunting for it in the text. Both states draw
       * something: a filled dot is unread and a hollow ring is read, so the
       * column is never ambiguous about whether it has an answer. */}
      <Box
        aria-hidden
        sx={{
          flex: "0 0 auto",
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: (theme) =>
            unread ? theme.palette.primary.main : "transparent",
          border: (theme) =>
            unread ? "none" : `1.5px solid ${theme.palette.brand.cardRule}`,
        }}
      />
    </ListItemButton>
  );

  /* What a screen reader is told, which is the whole row in one sentence: it
   * sees neither the face, the ring, nor the column they sit in. */
  function said(of: Notification): string {
    const what = of.ActorName ? `${of.ActorName} ${of.Message}` : of.Message;
    const when = relativeTime(of.CreatedAt, language.tag);
    return unread
      ? t("{{what}}, {{when}} — unread. Mark as read.", { what, when })
      : t("{{what}}, {{when}} — read.", { what, when });
  }
}
