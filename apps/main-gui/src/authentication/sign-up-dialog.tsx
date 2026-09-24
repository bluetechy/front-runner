import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import Link from "@mui/material/Link";
import OutlinedInput from "@mui/material/OutlinedInput";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useNavigate } from "@tanstack/react-router";
import AppleIcon from "@/shared/icons/AppleIcon";
import CloseIcon from "@/shared/icons/CloseIcon";
import FacebookIcon from "@/shared/icons/FacebookIcon";
import GoogleIcon from "@/shared/icons/GoogleIcon";
import { useId, useState, type FormEvent } from "react";
import { startRedirect, type RedirectIntent } from "./identity-provider";
import {
  checkRegistration,
  type RegistrationForm,
} from "./registration-schema";
import { RegistrationError, registerAccount } from "./registration";
import { useSession } from "./session";

/*
 * The sign-up card: the login card's twin, asking for the six things the realm
 * needs to make an account.
 *
 * Those six are the provider's own registration page's, because that page is what
 * this replaces -- the realm does not use the address as the username, so both
 * are asked for. What is different is everything around them: this is our
 * field, our type and our gradient, on the site somebody is already looking
 * at, rather than a page in another application's colors at another address.
 *
 * Making the account and signing in with it are two acts, in that order:
 * main-api creates it through the provider's admin API, and then this signs in
 * through the same password grant the login card uses, with the password
 * still in hand. A failure to sign in after a successful registration is
 * therefore not a failure to register, and says so -- the account is there,
 * and the login card will take it.
 */

const providers = [
  { alias: "google", label: "Sign Up With Google", Icon: GoogleIcon },
  { alias: "facebook", label: "Sign Up With Facebook", Icon: FacebookIcon },
  { alias: "apple", label: "Sign Up With Apple ID", Icon: AppleIcon },
] as const;

const empty: RegistrationForm = {
  FirstName: "",
  LastName: "",
  Username: "",
  Email: "",
  Password: "",
  Confirm: "",
};

export function SignUpDialog({
  open,
  onClose,
  onLogin,
}: {
  open: boolean;
  onClose: () => void;
  /* "Already have an account?" -- the other card, rather than a second
   * dialog of its own. */
  onLogin: () => void;
}) {
  const { login } = useSession();
  const navigate = useNavigate();
  const titleId = useId();
  const fieldId = useId();

  const [form, setForm] = useState<RegistrationForm>(empty);
  const [problems, setProblems] = useState<
    Partial<Record<keyof RegistrationForm, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (field: keyof RegistrationForm) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    /* The sentence under a box goes as soon as it is being fixed, rather
     * than waiting for the next submit to say it is gone. */
    setProblems((current) => ({ ...current, [field]: undefined }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);

    /* Every box is checked at once. A form that has to be submitted once per
     * mistake is a form nobody finishes. */
    const found = checkRegistration(form);
    setProblems(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const account = await registerAccount(form);
      /* Straight in with the password they just chose. "Remember me" is the
       * login card's question and is not asked here; a new account is
       * remembered, which is what somebody who has just made one expects. */
      await login(account.Email, form.Password, true);
      onClose();
      await navigate({ to: "/dashboard" });
    } catch (failure) {
      /* The account may well exist now: only the sign-in after it failed.
       * Saying "could not create your account" here would send somebody to
       * make a second one, which the realm would refuse. */
      setError(
        failure instanceof RegistrationError
          ? failure.message
          : "Your account was created, but signing in failed. Try logging in.",
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

  /* Each box, with its label above it the way the theme draws them, and its
   * own sentence underneath when there is one. */
  const field = (
    name: keyof RegistrationForm,
    label: string,
    props: {
      type?: string;
      autoComplete: string;
      placeholder: string;
    },
  ) => {
    const id = `${fieldId}-${name}`;
    const problem = problems[name];
    return (
      <FormControl fullWidth variant="outlined" error={!!problem}>
        <InputLabel htmlFor={id}>{label}</InputLabel>
        <OutlinedInput
          id={id}
          type={props.type ?? "text"}
          autoComplete={props.autoComplete}
          placeholder={props.placeholder}
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
         * exit for anyone who does not reach for either. Held back while a
         * registration is in flight, like everything else here. */}
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
          Create Account
        </Typography>
        <Typography
          variant="body2"
          sx={{ textAlign: "center", mt: 0.5, color: "text.secondary" }}
        >
          A few details and you are in
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ mt: 2.5, borderRadius: 2 }}>
            {error}
          </Alert>
        ) : null}

        <Stack spacing={2.25} sx={{ mt: 3 }}>
          {/* The two names share a row on anything but a narrow phone: they
           * are half-length answers, and six full-width boxes make a card
           * somebody has to scroll. */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2.25}>
            {field("FirstName", "First name", {
              autoComplete: "given-name",
              placeholder: "Your first name",
            })}
            {field("LastName", "Last name", {
              autoComplete: "family-name",
              placeholder: "Your last name",
            })}
          </Stack>
          {field("Username", "Username", {
            autoComplete: "username",
            placeholder: "Pick a username",
          })}
          {field("Email", "Email", {
            type: "email",
            autoComplete: "email",
            placeholder: "Enter your email address",
          })}
          {field("Password", "Password", {
            type: "password",
            autoComplete: "new-password",
            placeholder: "At least 8 characters",
          })}
          {field("Confirm", "Confirm password", {
            type: "password",
            autoComplete: "new-password",
            placeholder: "Type it once more",
          })}
        </Stack>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={busy}
          sx={{ mt: 2.75 }}
          startIcon={
            busy ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          {busy ? "Creating your account" : "Sign Up"}
        </Button>

        <Divider sx={{ my: 2.75, color: "text.secondary", fontSize: "0.8rem" }}>
          or
        </Divider>

        {/* The same three as the login card. Signing up with a provider and
         * signing in with one are the same redirect: the provider makes the
         * account the first time it is offered an identity it does not
         * know. */}
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
          Already have an Account ?{" "}
          <Link
            component="button"
            type="button"
            underline="hover"
            onClick={onLogin}
            sx={{ color: "primary.light", fontSize: "inherit" }}
          >
            Login
          </Link>
        </Typography>
      </Box>
    </Dialog>
  );
}
