import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import Link from "@mui/material/Link";
import OutlinedInput from "@mui/material/OutlinedInput";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useNavigate } from "@tanstack/react-router";
import AppleIcon from "@/shared/icons/AppleIcon";
import ArrowRightIcon from "@/shared/icons/ArrowRightIcon";
import CloseIcon from "@/shared/icons/CloseIcon";
import FacebookIcon from "@/shared/icons/FacebookIcon";
import GoogleIcon from "@/shared/icons/GoogleIcon";
import { useId, useState, type FormEvent } from "react";
import {
  SignInError,
  passwordResetUrl,
  startRedirect,
  type RedirectIntent,
} from "./keycloak";
import { useSession } from "./session";

/*
 * The sign-in dialog from the supplied mock-up. Its layout is the mock-up's;
 * its colours are this app's, because a slate card with a blue button would
 * be the only thing on the site not drawn from the violet field.
 *
 * Only the email-and-password form completes here. Everything else on the
 * card -- the three social providers, Sign Up, Forgot Password -- is a flow
 * Keycloak hosts, so those leave the page and come back to /auth/callback.
 */

const providers = [
  { alias: "google", label: "Login With Google", Icon: GoogleIcon },
  { alias: "facebook", label: "Login With Facebook", Icon: FacebookIcon },
  { alias: "apple", label: "Login With Apple ID", Icon: AppleIcon },
] as const;

export function LoginDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { login } = useSession();
  const navigate = useNavigate();
  const titleId = useId();
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password, remember);
      onClose();
      await navigate({ to: "/signed-in" });
    } catch (failure) {
      setError(
        failure instanceof SignInError
          ? failure.message
          : "Sign-in failed. Please try again.",
      );
      setBusy(false);
    }
  }

  function leaveFor(intent: RedirectIntent) {
    setError(null);
    setBusy(true);
    void startRedirect(intent).catch(() => {
      setError("Could not reach the identity provider.");
      setBusy(false);
    });
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
        {/* Escape and the backdrop already close the dialog; this is the
         * same exit for anyone who does not reach for either. Held back
         * while a sign-in is in flight, like the other two. */}
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
          Welcome Back
        </Typography>
        <Typography
          variant="body2"
          sx={{ textAlign: "center", mt: 0.5, color: "text.secondary" }}
        >
          Please login to your account
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ mt: 2.5, borderRadius: 2 }}>
            {error}
          </Alert>
        ) : null}

        <FormControl fullWidth variant="outlined" sx={{ mt: 3 }}>
          <InputLabel htmlFor={emailId}>Email</InputLabel>
          <OutlinedInput
            id={emailId}
            type="email"
            autoComplete="username"
            placeholder="Enter your email"
            label={null}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </FormControl>

        <FormControl fullWidth variant="outlined" sx={{ mt: 2.25 }}>
          <InputLabel htmlFor={passwordId}>Password</InputLabel>
          <OutlinedInput
            id={passwordId}
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            label={null}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            endAdornment={
              <InputAdornment position="end">
                {/* The mock-up's arrow. It submits, the same as the button. */}
                <IconButton
                  type="submit"
                  aria-label="Login"
                  disabled={busy}
                  sx={{ color: "text.secondary", mr: -0.5 }}
                >
                  <ArrowRightIcon size={20} />
                </IconButton>
              </InputAdornment>
            }
          />
        </FormControl>

        <Stack
          direction="row"
          sx={{
            mt: 1.25,
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
            }
            label="Remember me"
            slotProps={{ typography: { sx: { fontSize: "0.85rem" } } }}
          />
          {/* Keycloak owns the reset: it emails a link and takes it from there. */}
          <Link
            href={passwordResetUrl()}
            underline="hover"
            sx={{ fontSize: "0.8rem", color: "primary.light" }}
          >
            Forgot Password
          </Link>
        </Stack>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={busy}
          sx={{ mt: 2.25 }}
          startIcon={
            busy ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          {busy ? "Signing in" : "Login"}
        </Button>

        <Divider sx={{ my: 2.75, color: "text.secondary", fontSize: "0.8rem" }}>
          or
        </Divider>

        <Stack spacing={1.25}>
          {providers.map(({ alias, label, Icon }) => (
            <Button
              key={alias}
              type="button"
              variant="outlined"
              fullWidth
              disabled={busy}
              startIcon={<Icon size={18} />}
              onClick={() => leaveFor({ kind: "login", idpHint: alias })}
            >
              {label}
            </Button>
          ))}
        </Stack>

        <Typography
          variant="body2"
          sx={{
            mt: 2.75,
            textAlign: "center",
            fontSize: "0.8rem",
            color: "text.secondary",
          }}
        >
          Don&rsquo;t have an Account ?{" "}
          <Link
            component="button"
            type="button"
            underline="hover"
            onClick={() => leaveFor({ kind: "register" })}
            sx={{ color: "primary.light", fontSize: "inherit" }}
          >
            Sign Up
          </Link>
        </Typography>
      </Box>
    </Dialog>
  );
}
