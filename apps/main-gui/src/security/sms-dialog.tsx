import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import Link from "@mui/material/Link";
import OutlinedInput from "@mui/material/OutlinedInput";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useId, useState } from "react";
import CloseIcon from "@/shared/icons/CloseIcon";

/*
 * Attaching a phone number, in the two steps it actually takes.
 *
 * The authenticator app leaves this page: the provider mints a secret and
 * shows it once, so the browser has to go there. A phone number has no secret
 * to mint. What it has is a question -- can the person setting this up answer
 * a message sent to that number -- and that question can be asked here, which
 * is why this is a dialog rather than a redirect.
 *
 * **Nothing is on the account until the second step.** The first sends a code
 * to a number somebody typed, and a number somebody typed is not yet a number
 * they own. Somebody who closes this dialog at the code box has changed
 * nothing, and the card behind it still says SMS is off, because it is.
 *
 * Two things the copy carries that are easy to leave out. The number is read
 * back masked before the code box, which is how a mistyped digit is caught by
 * the person who typed it rather than by a message that never arrives. And
 * "Use a different number" goes back to the first step rather than closing,
 * because that is what somebody who sees the wrong last four digits wants.
 */

export function SmsDialog({
  open,
  busy,
  error,
  /* The masked number the API says it texted, or null while the first step is
   * still the one showing. Held by the caller, because it is the API's answer
   * rather than what was typed into the box here. */
  sentTo,
  onClose,
  onBack,
  onSend,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  error: string | null;
  sentTo: string | null;
  onClose: () => void;
  /* Back to the number box from the code box. The caller clears what the API
   * said it texted, which is the only thing telling the two steps apart. */
  onBack: () => void;
  onSend: (phoneNumber: string) => void;
  onConfirm: (code: string) => void;
}) {
  const titleId = useId();
  const numberId = useId();
  const codeId = useId();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");

  const asking = sentTo !== null;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      aria-labelledby={titleId}
      maxWidth="xs"
      fullWidth
    >
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          if (asking) onConfirm(code.trim());
          else onSend(phoneNumber.trim());
        }}
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

        <Typography
          id={titleId}
          variant="h2"
          sx={{ fontSize: "1.4rem", fontWeight: 700, pr: 4 }}
        >
          {asking ? "Enter the code we texted you" : "Add a phone number"}
        </Typography>

        <Stack sx={{ gap: 1.25, mt: 1.75 }}>
          {asking ? (
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", lineHeight: 1.7 }}
            >
              We sent a six-digit code to {sentTo}. It expires in ten minutes,
              and your account keeps no number until you type it back.
            </Typography>
          ) : (
            <>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", lineHeight: 1.7 }}
              >
                We will text a six-digit code to this number to check it reaches
                you. Write it with its country code, like +1 555 555 0123.
              </Typography>
              {/* Said where the decision is made rather than afterwards. An
               * authenticator app is a better second factor and this is the
               * moment somebody is choosing between them. */}
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", lineHeight: 1.7 }}
              >
                A text message is the weaker choice: messages can be read on a
                lock screen, and a phone number can be moved to somebody else's
                handset. An authenticator app is safer if you can use one.
              </Typography>
            </>
          )}

          {error ? (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          ) : null}

          {asking ? (
            <Box>
              <InputLabel htmlFor={codeId}>Code</InputLabel>
              <OutlinedInput
                id={codeId}
                fullWidth
                /* Text rather than number, because a code can start with a
                 * zero and a number input drops it. */
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                }
              />
            </Box>
          ) : (
            <Box>
              <InputLabel htmlFor={numberId}>Phone number</InputLabel>
              <OutlinedInput
                id={numberId}
                fullWidth
                type="tel"
                autoComplete="tel"
                placeholder="+1 555 555 0123"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
              />
            </Box>
          )}
        </Stack>

        {/* The way out for somebody who read the last four digits back and
         * did not recognize them. Shutting the dialog would work too, and it
         * is the wrong shape: the thing they want is this step again.
         *
         * A link in a sentence rather than a third button, which is what the
         * login card's "Use a recovery code" is and for the same reason: a
         * plain text button on this panel draws as a line of prose, so the
         * one way out of the step nobody expected to be stuck on is the one
         * control that does not look like one. */}
        {asking ? (
          <Typography
            variant="body2"
            sx={{ mt: 1.25, fontSize: "0.8rem", color: "text.secondary" }}
          >
            Not the last four digits you expected?{" "}
            <Link
              component="button"
              type="button"
              underline="hover"
              disabled={busy}
              onClick={() => {
                setCode("");
                onBack();
              }}
              sx={{ color: "primary.light", fontSize: "inherit" }}
            >
              Use a different number
            </Link>
          </Typography>
        ) : null}

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
            type="submit"
            variant="outlined"
            disabled={busy || (asking ? code.length < 6 : !phoneNumber.trim())}
            startIcon={
              busy ? <CircularProgress size={14} color="inherit" /> : undefined
            }
            sx={{ fontFamily: "inherit", fontStyle: "normal" }}
          >
            {asking ? "Turn it on" : "Send the code"}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}
