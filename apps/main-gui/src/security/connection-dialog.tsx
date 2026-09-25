import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useId } from "react";
import CloseIcon from "@/shared/icons/CloseIcon";
import type { SignInMethod } from "./sso-api";
import { kindOf } from "./sso-kinds";

/*
 * Connecting a provider to this account, or taking one away. One dialog for
 * both, because they are the same question asked in two directions and the
 * answer to each is a sentence about what happens next.
 *
 * **Connecting is the reason this dialog exists at all.** Pressing Connect
 * does not connect anything: it hands the browser to the identity provider,
 * which hands it to Google, and the page it was pressed on is gone until all
 * of that is over. Somebody who is about to lose the page they are on should
 * be told so first, and told that they may be asked to login on the way --
 * which they will be, unless they already have a session with the provider.
 * A button that silently navigates the browser somewhere else is the one
 * shape a security page cannot afford.
 *
 * Disconnecting asks because it is the opposite of a trip: it happens at once
 * and cannot be undone from this page. Reconnecting means the whole journey
 * above, which is worth knowing before rather than after.
 *
 * The violet panel, the close button and the two plain outlined buttons are
 * the activity dialog's, next door, for the reason that one gives: a dialog in
 * this product is one surface, and the answers to a question about an account
 * are not painted to nudge anybody towards either of them.
 */

export interface ConnectionRequest {
  method: SignInMethod;
  action: "connect" | "disconnect";
}

export function ConnectionDialog({
  request,
  busy,
  onClose,
  onConfirm,
}: {
  /* The row being asked about, or null when the dialog is shut. Held by the
   * caller rather than copied in here, so the last one keeps being drawn
   * through the closing transition instead of being torn out from under
   * it. */
  request: ConnectionRequest | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (request: ConnectionRequest) => void;
}) {
  const titleId = useId();
  const connecting = request?.action === "connect";
  const { Icon } = kindOf(request?.method.Alias ?? "");

  return (
    <Dialog
      open={request !== null}
      onClose={busy ? undefined : onClose}
      aria-labelledby={titleId}
      maxWidth="xs"
      fullWidth
    >
      <Box
        sx={{
          position: "relative",
          p: { xs: "1.75rem 1.5rem", sm: "2rem 2.25rem" },
        }}
      >
        <IconButton
          aria-label="Close"
          onClick={onClose}
          disabled={busy}
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            color: "text.secondary",
            "&:hover": { color: "text.primary" },
          }}
        >
          <CloseIcon color="currentColor" size={20} />
        </IconButton>

        {request ? (
          <>
            <Stack
              direction="row"
              sx={{ gap: 1.25, alignItems: "center", pr: 4 }}
            >
              <Box aria-hidden sx={{ display: "inline-flex" }}>
                <Icon color="currentColor" size={26} />
              </Box>
              <Typography
                id={titleId}
                variant="h2"
                sx={{ fontSize: "1.4rem", fontWeight: 700 }}
              >
                {connecting ? "Connect" : "Disconnect"} {request.method.Name}
              </Typography>
            </Stack>

            <Stack sx={{ gap: 1.25, mt: 1.75 }}>
              {sentences(request).map((sentence) => (
                <Typography
                  key={sentence}
                  variant="body2"
                  sx={{ color: "text.secondary", lineHeight: 1.7 }}
                >
                  {sentence}
                </Typography>
              ))}
            </Stack>

            <Stack
              direction="row"
              sx={{ gap: 1, mt: 2.5, justifyContent: "flex-end" }}
            >
              <Button
                type="button"
                variant="outlined"
                disabled={busy}
                onClick={onClose}
                sx={{ fontFamily: "inherit", fontStyle: "normal" }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outlined"
                disabled={busy}
                onClick={() => onConfirm(request)}
                startIcon={
                  busy ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : undefined
                }
                sx={{ fontFamily: "inherit", fontStyle: "normal" }}
              >
                {connecting
                  ? `Continue to ${request.method.Name}`
                  : `Disconnect ${request.method.Name}`}
              </Button>
            </Stack>
          </>
        ) : null}
      </Box>
    </Dialog>
  );
}

/*
 * What the dialog says, as whole sentences rather than one paragraph with a
 * name substituted into it three times.
 *
 * Connecting says the three things somebody is about to find out the hard way:
 * this page goes away, there may be a login on the route, and everything else
 * they login with still works afterwards. That last one is the question this
 * card gets asked most -- connecting a provider is widely read as replacing
 * the password, and it does not.
 *
 * It says "nothing else you login with" rather than naming the password,
 * which is the sentence that is true of every account rather than of most of
 * them: an account that arrived through a provider may never have had a
 * password, and telling somebody theirs still works is no comfort when they
 * do not have one.
 *
 * Disconnecting says what stops working and what does not, and it says the
 * trip back, because reconnecting is the whole journey above rather than an
 * undo.
 */
function sentences(request: ConnectionRequest): string[] {
  const name = request.method.Name;
  if (request.action === "connect")
    return [
      `This page will go to ${name} so you can prove the account there is yours. You may be asked to login here on the way.`,
      `When you come back, you will be able to login with ${name} as well.`,
      "Nothing else you login with changes, and it all keeps working.",
    ];
  return [
    `You will no longer be able to login with ${name}.`,
    "Nothing else you login with changes, and it all keeps working.",
    `Connecting it again means the same trip out to ${name}.`,
  ];
}
