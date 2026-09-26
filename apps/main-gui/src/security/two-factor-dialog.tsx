import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useId } from "react";
import CloseIcon from "@/shared/icons/CloseIcon";
import type { TwoFactorMethod } from "./two-factor-api";
import { kindOf } from "./two-factor-kinds";

/*
 * Turning a second factor on, or taking one off. One dialog for both, the way
 * `connection-dialog.tsx` next door handles connecting and disconnecting, and
 * for the same reason: they are the same question asked in two directions,
 * and the answer to each is a sentence about what happens next.
 *
 * **Turning it on is the reason this exists at all.** Pressing the button
 * does not turn anything on: it hands the browser to the identity provider,
 * which shows its own page with a QR code on it, and the page it was pressed
 * from is gone until that is over. Somebody about to lose the page they are
 * on should be told, and told they will need the app in their hand when they
 * get there, because the code is shown once.
 *
 * Turning it off asks because it happens at once, cannot be undone from this
 * page, and leaves the account standing on its password alone. That last
 * sentence is the one worth saying out loud on a security page.
 *
 * The violet panel, the close button and the two plain outlined buttons are
 * the other two dialogs' on this page: one surface, and the answers to a
 * question about an account are not painted to nudge anybody towards either.
 */

export interface TwoFactorRequest {
  method: TwoFactorMethod;
  action: "enable" | "disable";
}

export function TwoFactorDialog({
  request,
  busy,
  hasRecoveryCodes,
  onClose,
  onConfirm,
}: {
  /* The row being asked about, or null when the dialog is shut. Held by the
   * caller rather than copied in here, so the last one keeps being drawn
   * through the closing transition. */
  request: TwoFactorRequest | null;
  busy: boolean;
  /* Whether the account has any recovery codes left. It changes one sentence
   * on the way in: somebody turning a factor on with no codes behind it is
   * one lost phone away from a support request. */
  hasRecoveryCodes: boolean;
  onClose: () => void;
  onConfirm: (request: TwoFactorRequest) => void;
}) {
  const titleId = useId();
  const enabling = request?.action === "enable";
  const { Icon } = kindOf(request?.method.Kind ?? "");

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
                {enabling ? "Turn on" : "Turn off"} {request.method.Name}
              </Typography>
            </Stack>

            <Stack sx={{ gap: 1.25, mt: 1.75 }}>
              {sentences(request, hasRecoveryCodes).map((sentence) => (
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
                {enabling ? "Continue to setup" : "Turn it off"}
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
 * name dropped into it three times.
 *
 * Turning it on says the three things somebody would otherwise find out the
 * hard way: this page goes away, the app has to be in your hand when you get
 * there, and from then on every login asks for a code. The fourth sentence is
 * only for an account with no recovery codes, because that is the account
 * that a lost phone locks out.
 *
 * Turning it off says what stops being asked for, what that leaves, and that
 * turning it on again is the same trip rather than an undo.
 */
function sentences(
  request: TwoFactorRequest,
  hasRecoveryCodes: boolean,
): string[] {
  const name = request.method.Name;
  if (request.action === "enable")
    return [
      `This page will go to our identity provider, which will show you a QR code to scan with your ${name.toLowerCase()}. Have it ready: the code is shown once.`,
      "From then on, logging in asks for the six digits your app is showing as well as your password.",
      ...(hasRecoveryCodes
        ? []
        : [
            "Make a set of recovery codes afterwards. They are the only way back into your account if you lose the phone.",
          ]),
    ];
  return [
    `Logging in will stop asking for your ${name.toLowerCase()} code.`,
    "Your account will be protected by its password alone.",
    "You can turn it on again here, which means the same trip out to set it up.",
  ];
}
