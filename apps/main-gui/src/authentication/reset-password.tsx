import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import OutlinedInput from "@mui/material/OutlinedInput";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useId, useState, type FormEvent } from "react";
import { useLoginPrompt } from "./login-prompt";
import {
  checkNewPassword,
  type NewPasswordForm,
} from "./password-reset-schema";
import { PasswordChecklist } from "./password-checklist";
import { PasswordResetError, resetPassword } from "./password-reset";

/*
 * Where a password reset link lands.
 *
 * A marketing-shell page rather than an application one, and that is the
 * whole point: the link is opened by whoever reads the mailbox, on whatever
 * machine that mailbox is on, and this is somebody who cannot login by
 * definition. So it sends the token and the new password and nothing else,
 * and the mutation behind it is `@Public`.
 *
 * No token of ours is read from storage and none is sent. The token on the
 * URL is the authorization, it is spent on first use, and this page is the
 * only thing that ever holds it.
 *
 * Unlike `/verify-email`, nothing happens here on arrival. That page spends
 * its token in an effect because following the link is the whole act; this
 * one waits, because the act is choosing a password and the token is spent
 * when that is submitted.
 */

const empty: NewPasswordForm = { Password: "", Confirm: "" };

export function ResetPassword({ token }: { token: string | undefined }) {
  const { open } = useLoginPrompt();
  const fieldId = useId();

  const [form, setForm] = useState<NewPasswordForm>(empty);
  const [problems, setProblems] = useState<
    Partial<Record<keyof NewPasswordForm, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /* The login name the API answered with, which is how this page knows it is
   * finished as well as what to put on the screen. */
  const [loginName, setLoginName] = useState<string | null>(null);

  const set = (field: keyof NewPasswordForm) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    /* The sentence under a box goes as soon as it is being fixed. */
    setProblems((current) => ({ ...current, [field]: undefined }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !token) return;
    setError(null);

    const found = checkNewPassword(form);
    setProblems(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      setLoginName(await resetPassword(token, form.Password));
      setBusy(false);
    } catch (failure) {
      setError(
        failure instanceof PasswordResetError
          ? failure.message
          : "That password could not be set. Please try again.",
      );
      setBusy(false);
    }
  }

  const field = (
    name: keyof NewPasswordForm,
    label: string,
    placeholder: string,
  ) => {
    const id = `${fieldId}-${name}`;
    const problem = problems[name];
    return (
      <FormControl fullWidth variant="outlined" error={!!problem}>
        <InputLabel htmlFor={id}>{label}</InputLabel>
        <OutlinedInput
          id={id}
          type="password"
          autoComplete="new-password"
          placeholder={placeholder}
          label={null}
          value={form[name]}
          onChange={(event) => set(name)(event.target.value)}
          required
        />
        {problem ? <FormHelperText>{problem}</FormHelperText> : null}
      </FormControl>
    );
  };

  return (
    <Container
      component="section"
      sx={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        justifyContent: "center",
        paddingBlock: "clamp(4rem, 12vw, 9rem)",
      }}
    >
      <Typography variant="h2" sx={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}>
        {loginName ? "Password changed" : "Choose a new password"}
      </Typography>

      {/* A link somebody typed out by hand, or one a mail client mangled.
       * There is nothing to submit, so the form is not drawn at all. */}
      {!token ? (
        <Body>
          This link is missing its token. Open the link from the email rather
          than typing it out, or ask for another one from the login card.
        </Body>
      ) : null}

      {loginName ? (
        <>
          <Body>
            You can login as {loginName} with your new password. The link you
            followed has been used and will not work again.
          </Body>
          <Box sx={{ mt: 3 }}>
            <Button variant="contained" onClick={open}>
              Login
            </Button>
          </Box>
        </>
      ) : null}

      {token && !loginName ? (
        <Box component="form" onSubmit={submit} noValidate sx={{ mt: 2 }}>
          <Body>
            Type it twice, so a mistake in the first one cannot lock you out of
            the account you are opening.
          </Body>

          {error ? (
            <Alert
              severity="error"
              sx={{ mt: 2.5, borderRadius: 2, maxWidth: "36rem" }}
            >
              {error}
            </Alert>
          ) : null}

          <Stack spacing={2.25} sx={{ mt: 3, maxWidth: "24rem" }}>
            {/* The rules under the box rather than crammed into its
             * placeholder. Five of them will not fit in one line of gray
             * text, and a placeholder that named only the first would be
             * refusing somebody for four rules it never mentioned. */}
            <Box>
              {field("Password", "New password", "Your new password")}
              <PasswordChecklist password={form.Password} />
            </Box>
            {field("Confirm", "Confirm password", "Type it once more")}
            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={busy}
                startIcon={
                  busy ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : undefined
                }
              >
                {busy ? "Setting your password" : "Set Password"}
              </Button>
            </Box>
          </Stack>
        </Box>
      ) : null}
    </Container>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="body1"
      sx={{ maxWidth: "52ch", mt: 2, color: "text.secondary" }}
    >
      {children}
    </Typography>
  );
}
