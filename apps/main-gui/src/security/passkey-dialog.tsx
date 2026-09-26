import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useId } from "react";
import CloseIcon from "@/shared/icons/CloseIcon";
import PasskeyIcon from "@/shared/icons/PasskeyIcon";
import type { Passkey } from "./passkey-api";

/*
 * Adding a passkey, or taking one off. One dialog for both, the way
 * `connection-dialog.tsx` and `two-factor-dialog.tsx` each handle their own
 * pair, and for the same reason: they are the same question asked in two
 * directions, and the answer to each is a sentence about what happens next.
 *
 * **Adding one is the reason this exists at all.** Pressing the button does
 * not add anything: it hands the browser to the identity provider, whose own
 * page runs the ceremony, and the page it was pressed from is gone until
 * that is over. Somebody about to lose the page they are on should be told,
 * and told what their own device is about to ask them for, because a browser
 * dialog that appears unannounced is a browser dialog people dismiss.
 *
 * Removing one asks because it happens at once and cannot be undone from
 * this page: registering it again means the trip out and the ceremony again,
 * on the device it lives on. It does not warn about being locked out,
 * because nobody is: the password and every connected provider still work,
 * and saying otherwise would be a card frightening somebody with a risk that
 * is not there.
 *
 * The violet panel, the close button and the two plain outlined buttons are
 * the other dialogs' on this page: one surface, and the answers to a
 * question about an account are not painted to nudge anybody towards either.
 */

export interface PasskeyRequest {
  /* The row being asked about. Null on the way in, where there is no row
   * yet: an account with no passkeys still has something to be asked. */
  passkey: Passkey | null;
  action: "add" | "remove";
}

export function PasskeyDialog({
  request,
  busy,
  onClose,
  onConfirm,
}: {
  /* The request, or null when the dialog is shut. Held by the caller rather
   * than copied in here, so the last one keeps being drawn through the
   * closing transition. */
  request: PasskeyRequest | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (request: PasskeyRequest) => void;
}) {
  const titleId = useId();
  const adding = request?.action === "add";

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
                <PasskeyIcon color="currentColor" size={26} />
              </Box>
              <Typography
                id={titleId}
                variant="h2"
                sx={{ fontSize: "1.4rem", fontWeight: 700 }}
              >
                {adding ? "Add a passkey" : "Remove this passkey"}
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
                {adding ? "Continue to your device" : "Remove it"}
              </Button>
            </Stack>
          </>
        ) : null}
      </Box>
    </Dialog>
  );
}

/*
 * What the dialog says, as whole sentences rather than one paragraph.
 *
 * Adding one says the three things somebody would otherwise find out the
 * hard way: this page goes away, their own device is about to ask them for
 * something, and the key stays on that device. The last of those is the one
 * people are most often surprised by, and the reason a passkey made on a
 * work laptop is no use on a phone.
 *
 * Removing one says what stops working and what still does. The second half
 * matters more than the first: a security page that removes a credential
 * without saying what is left is a page people stop pressing buttons on.
 */
function sentences(request: PasskeyRequest): string[] {
  if (request.action === "add")
    return [
      "This page will go to our identity provider, which will ask this device to make a passkey. Your browser will ask you to confirm with your face, your fingerprint, a screen lock or a security key.",
      "The key itself stays on the device that makes it and is never sent to us. A passkey made here will not work on your phone: add one there too, on the phone.",
      "Adding one replaces nothing. Your password and anything you have connected still work.",
    ];
  return [
    request.passkey?.Label
      ? `"${request.passkey.Label}" will stop being able to login to this account.`
      : "This passkey will stop being able to login to this account.",
    "Your password and anything you have connected still work, so this does not lock you out.",
    "You can add it again here, which means the same trip out, on the device the passkey lives on.",
  ];
}
