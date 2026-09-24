import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import Link from "@mui/material/Link";
import OutlinedInput from "@mui/material/OutlinedInput";
import Typography from "@mui/material/Typography";
import CloseIcon from "@/shared/icons/CloseIcon";
import { useId, useState, type FormEvent } from "react";
import { checkIdentifier } from "./password-reset-schema";
import { PasswordResetError, requestPasswordReset } from "./password-reset";

/*
 * The forgot-password card: the third of the three the prompt owns, and the
 * smallest. One box, because one thing is being asked.
 *
 * It replaces the provider's own reset-credentials page, which is a different
 * site in different colors reached at the moment somebody is already
 * struggling. What it cannot replace is the message and the page the link in
 * it lands on, so those are ours too: main-api mints the token and sends the
 * mail, and the link opens `/reset-password`. See apps/main-api/src/password-reset.
 *
 * The card says the same sentence whatever happens, and that is the point
 * rather than an oversight. The API answers a name that matches an account
 * exactly as it answers one that does not, because a form that said "no such
 * account" would be the easiest way in the product to find out who has one.
 * So there is nothing here to report except that the asking is done.
 */

export function ForgotPasswordDialog({
  open,
  onClose,
  onLogin,
}: {
  open: boolean;
  onClose: () => void;
  /* "Back to Login" -- the login card, rather than a second dialog. */
  onLogin: () => void;
}) {
  const titleId = useId();
  const identifierId = useId();

  const [identifier, setIdentifier] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /* Asked and answered. The card stays open on this rather than closing,
   * because what it has to say is the whole outcome. */
  const [asked, setAsked] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);

    const found = checkIdentifier(identifier);
    setProblem(found);
    if (found) return;

    setBusy(true);
    try {
      await requestPasswordReset(identifier);
      setAsked(true);
      setBusy(false);
    } catch (failure) {
      /* A failure here is this application's, not an answer about the
       * account: the API does not refuse a name it does not know. */
      setError(
        failure instanceof PasswordResetError
          ? failure.message
          : "Could not ask for a reset link. Please try again.",
      );
      setBusy(false);
    }
  }

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
        onSubmit={submit}
        noValidate
        sx={{
          position: "relative",
          p: { xs: "1.75rem 1.5rem", sm: "2.25rem 2.5rem" },
        }}
      >
        {/* Escape and the backdrop already close the dialog; this is the same
         * exit for anyone who does not reach for either. */}
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
          sx={{
            fontSize: "2rem",
            textAlign: "center",
            color: "primary.light",
            fontWeight: 700,
          }}
        >
          Forgot Your Password ?
        </Typography>
        <Typography
          variant="body2"
          sx={{ textAlign: "center", mt: 0.5, color: "text.secondary" }}
        >
          {asked
            ? "Check your email"
            : "We will send you a link to choose a new one"}
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ mt: 2.5, borderRadius: 2 }}>
            {error}
          </Alert>
        ) : null}

        {asked ? (
          /* Deliberately not "we sent you a link": whether there was an
           * account to send one to is the one thing this card must not say. */
          <Typography
            variant="body2"
            sx={{ mt: 3, textAlign: "center", color: "text.secondary" }}
          >
            If {identifier} belongs to an account, a link to choose a new
            password is on its way to the email address on it. The link works
            once and stops working after an hour.
          </Typography>
        ) : (
          <>
            <FormControl
              fullWidth
              variant="outlined"
              error={!!problem}
              sx={{ mt: 3 }}
            >
              <InputLabel htmlFor={identifierId}>
                Username or email address
              </InputLabel>
              <OutlinedInput
                id={identifierId}
                type="text"
                autoComplete="username"
                placeholder="What you login with"
                label={null}
                value={identifier}
                onChange={(event) => {
                  setIdentifier(event.target.value);
                  setProblem(null);
                }}
                required
              />
              {problem ? <FormHelperText>{problem}</FormHelperText> : null}
            </FormControl>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={busy}
              sx={{ mt: 2.25 }}
              startIcon={
                busy ? (
                  <CircularProgress size={16} color="inherit" />
                ) : undefined
              }
            >
              {busy ? "Sending the link" : "Send Reset Link"}
            </Button>
          </>
        )}

        <Typography
          variant="body2"
          sx={{
            mt: 2.75,
            textAlign: "center",
            fontSize: "0.8rem",
            color: "text.secondary",
          }}
        >
          Remembered it ?{" "}
          <Link
            component="button"
            type="button"
            underline="hover"
            onClick={onLogin}
            sx={{ color: "primary.light", fontSize: "inherit" }}
          >
            Back to Login
          </Link>
        </Typography>
      </Box>
    </Dialog>
  );
}
