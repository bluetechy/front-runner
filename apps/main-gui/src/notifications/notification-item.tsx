import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import MarkReadIcon from "@/shared/icons/MarkReadIcon";
import { useLanguage } from "../language";
import { NotificationFace } from "./notification-face";
import { kindOf } from "./notification-kinds";
import { relativeTime } from "./relative-time";
import { isUnread, type Notification } from "./notifications-api";

/*
 * One row of the notifications page, which is the panel's row given the space
 * a page has: a chip saying what kind of thing this is, a larger face, and the
 * action written out rather than implied.
 *
 * **The row is not a button here, and it is in the panel.** That is deliberate
 * rather than drift. The panel is a quick action somebody opened on purpose,
 * where marking a notification read is the only thing to do and the target
 * should be the whole row. A page is somewhere to read, where rows are content
 * and a stray click should not quietly change something -- so the action is a
 * control of its own, which is also what the mock-up draws.
 *
 * Unread is said three ways, each for a different reader: the bar down the
 * left edge and the weight of the text are for the eye running down the list,
 * and the button being there at all is for somebody who has to be told what
 * they can do. A read row keeps the space the button occupied, so the column
 * of times does not shift as rows are read.
 */
export function NotificationItem({
  notification,
  onRead,
  busy,
}: {
  notification: Notification;
  onRead: (notificationId: string) => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const unread = isUnread(notification);
  const { label } = kindOf(notification.NotificationType);
  const when = relativeTime(notification.CreatedAt, language.tag);

  return (
    <Stack
      component="li"
      direction="row"
      sx={{
        position: "relative",
        alignItems: "flex-start",
        gap: { xs: 1.25, sm: 1.75 },
        paddingBlock: "1rem",
        paddingInline: { xs: "0.75rem", sm: "1rem" },
        borderBottom: (theme) => `1px solid ${theme.palette.brand.cardRule}`,
        backgroundColor: (theme) =>
          unread ? theme.palette.brand.cardTint : "transparent",
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      {/* The mock-up's stripe down the left edge of anything unread. It is the
       * accent itself rather than a tint of it: at three pixels wide there is
       * nothing to soften. */}
      {unread && (
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            insetBlock: 0,
            insetInlineStart: 0,
            width: 3,
            backgroundColor: "primary.main",
          }}
        />
      )}

      <NotificationFace notification={notification} size={48} />

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack
          direction="row"
          sx={{ alignItems: "baseline", gap: 1, flexWrap: "wrap" }}
        >
          <Box
            component="span"
            sx={{
              flex: "0 0 auto",
              paddingInline: "0.5rem",
              paddingBlock: "0.1rem",
              borderRadius: 999,
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: (theme) => theme.palette.brand.cardInkMuted,
              backgroundColor: (theme) => theme.palette.brand.cardField,
            }}
          >
            {t(label)}
          </Box>
          <Typography
            sx={{
              fontSize: "0.95rem",
              lineHeight: 1.5,
              color: (theme) => theme.palette.brand.cardInk,
            }}
          >
            {/* The actor's name leads and is the only bold thing in the row,
             * so a list of them reads as a column of names with what each one
             * did beside it. The message is written to follow a name, and
             * stands on its own where there is nobody. */}
            {notification.ActorName && (
              <Box
                component="span"
                sx={{ fontWeight: 700 }}
              >{`${notification.ActorName} `}</Box>
            )}
            {notification.Message}
          </Typography>
        </Stack>
        <Typography
          sx={{
            marginTop: "0.15rem",
            fontSize: "0.78rem",
            color: (theme) => theme.palette.brand.cardInkMuted,
          }}
        >
          {when}
        </Typography>
      </Box>

      {/* A fixed-width column whether or not it holds a button, so the rows
       * line up and nothing shifts as they are read. */}
      <Box sx={{ flex: "0 0 auto", width: 40, textAlign: "center" }}>
        {unread && (
          <Tooltip title={t("Mark as read")}>
            <span>
              <IconButton
                size="small"
                disabled={busy}
                onClick={() => onRead(notification.NotificationUUID)}
                aria-label={t("Mark as read: {{what}}", {
                  what: said(notification),
                })}
                sx={{
                  color: (theme) => theme.palette.brand.cardInkMuted,
                  "&:hover": {
                    color: (theme) => theme.palette.brand.cardInk,
                    backgroundColor: (theme) => theme.palette.brand.cardField,
                  },
                }}
              >
                <MarkReadIcon color="currentColor" size={18} />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
    </Stack>
  );
}

/* The row in words, for the label on its button: a screen reader hears what
 * it is about to mark rather than "Mark as read" eleven times. */
function said(notification: Notification): string {
  return notification.ActorName
    ? `${notification.ActorName} ${notification.Message}`
    : notification.Message;
}
