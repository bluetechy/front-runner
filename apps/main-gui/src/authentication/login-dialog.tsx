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
  startRedirect,
  type RedirectIntent,
} from "./identity-provider";
import { RecoveryCodeError, useRecoveryCode } from "./recovery-code";
import { useSession } from "./session";

/*
 * The sign-in dialog from the supplied mock-up. Its layout is the mock-up's;
 * its colors are this app's, because a slate card with a blue button would
 * be the only thing on the site not drawn from the violet field.
 *
 * Only the email-and-password form completes here. The three social
 * providers are flows the identity provider hosts, so those leave the page and come back
 * to /auth/callback. "Sign Up" and "Forgot Password" are neither: they are
 * the other two cards, which the prompt owning all three swaps in.
 *
 * **The second factor is asked for here, after a refusal, and it has to be
 * that way round.** Keycloak answers a wrong password and a missing code
 * identically -- 400, `invalid_grant`, "Invalid user credentials" -- and it
 * does that deliberately, so that a login form cannot be asked which accounts
 * have two-factor authentication on. So this card cannot know which of the
 * two just happened, and it does not pretend to: a refusal keeps what was
 * typed and lets it be tried again.
 *
 * **It waits for the third refusal before showing the code box.** The two
 * possibilities are not equally likely. Almost everybody who is refused has
 * mistyped a password, and answering that with a box for a feature the
 * account may not have turned on reads as a demand for a code that does not
 * exist. Somebody who does have a second factor spends two attempts getting
 * here, which is the price of not putting the question to everybody else --
 * and it is only ever attempts, never a lockout, because the box does arrive.
 *
 * **One box for both factors.** The digits go up under both of the names the
 * realm's two authenticators read, and whichever one is actually in the flow
 * finds them. The card never learns which factor the account has, and it must
 * not: knowing would mean being told at the login form, before anybody has
 * proved anything, which is the question the identical refusals exist to
 * refuse. It also makes the refusal do double duty for a texted code, because
 * the refusal is the moment Keycloak sends one.
 *
 * A code is good once, either way. The realm sets `otpPolicyCodeReusable`
 * false, so pressing Login twice with the same six digits from an app is
 * refused the second time even though the app is still showing them; a texted
 * code is spent the moment it is read, so a wrong guess costs a fresh message.
 * Both are why a refusal with a code in the box says to wait for the next one.
 */

/*
 * How many refusals the code box waits for.
 *
 * Three, and it is a judgement about which mistake is commoner rather than
 * anything the provider tells us: two typos are a bad day at the keyboard,
 * and by the third refusal an account that has a second factor is the better
 * explanation for why the password alone keeps being turned away.
 */
const REFUSALS_BEFORE_CODE = 3;

/*
 * What to say about a refusal.
 *
 * The provider says the same thing whatever went wrong, so the sentence
 * widens as the refusals mount rather than saying everything at once. The
 * first two say the thing that is almost always true, and the third adds the
 * second factor, which is the refusal the code box appears under.
 *
 * After that there is more to go on: a refusal with a code filled in is
 * either a wrong code or one that has already been spent, and the advice for
 * both is the same -- wait for the next one, because the digits on the screen
 * are not new digits.
 */
function refusal(
  failure: unknown,
  asked: boolean,
  code: string,
  asking: boolean,
): string {
  if (!(failure instanceof SignInError))
    return "Login failed. Please try again.";
  /* Something the provider named for itself: a disabled account, a client
   * that may not run this grant. Those sentences are worth more than
   * anything composed here. */
  if (failure.code !== "invalid_grant") return failure.message;
  if (asked && code)
    return "That code was not accepted. Codes work once, so wait for your app to show the next one, or for a new text message, and try again.";
  if (asking)
    return "That did not work. Check your email address and password, and if your account uses two-factor authentication, add the code from your authenticator app or the one we have just texted you.";
  return "That did not work. Check your email address and password.";
}

/* "1 code" or "4 codes", written out rather than left as "4 code(s)". */
function remaining(count: number): string {
  return count === 1 ? "1 recovery code left" : `${count} recovery codes left`;
}

/*
 * The three social providers, in the order somebody is most likely to hold an
 * account with rather than in alphabetical order.
 *
 * These are buttons somebody is being asked to press, and the one most of them
 * can press belongs where the eye lands first. The same three are listed
 * alphabetically on the security page's SSO card, which is not a contradiction
 * but the other half of the same rule: that card is a list of what an account
 * has and can do about it, nobody is being asked to press anything, and a list
 * to be looked something up in is ordered the way a list is looked something up
 * in. Ranking by likelihood there would be this application guessing at
 * somebody's own credentials.
 */
const providers = [
  { alias: "google", label: "Login With Google", Icon: GoogleIcon },
  { alias: "facebook", label: "Login With Facebook", Icon: FacebookIcon },
  { alias: "apple", label: "Login With Apple ID", Icon: AppleIcon },
] as const;

export function LoginDialog({
  open,
  onClose,
  onSignUp,
  onForgotPassword,
}: {
  open: boolean;
  onClose: () => void;
  /* "Don't have an Account?" -- the sign-up card, rather than the provider's own
   * registration page at another address in another application's colors. */
  onSignUp: () => void;
  /* "Forgot Password" -- the third card, for the same reason. The provider's
   * reset-credentials page is the one this replaces. */
  onForgotPassword: () => void;
}) {
  const { login } = useSession();
  const navigate = useNavigate();
  const titleId = useId();
  const emailId = useId();
  const passwordId = useId();

  const codeId = useId();
  const recoveryId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* The code box, and what opens it. It counts refusals rather than holding
   * a flag, because the box waits for the third: before then there is
   * nothing to suggest this account has a second factor at all -- and
   * nothing this card could ask that would find out -- while there is every
   * reason to think somebody has mistyped a password. */
  const [code, setCode] = useState("");
  const [refusals, setRefusals] = useState(0);
  const asksForCode = refusals >= REFUSALS_BEFORE_CODE;

  /* The way through for somebody whose phone is gone. It takes
   * the same email address and password as the form above it, plus one code
   * off the sheet, and it does not login: it takes the second factor off the
   * account so that the ordinary form does. */
  const [recovering, setRecovering] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (recovering) return recover();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await login(email.trim(), password, remember, code.trim() || undefined);
      onClose();
      await navigate({ to: "/dashboard" });
    } catch (failure) {
      /* Waiting costs a texted code nothing. The realm sends one on the
       * first refusal and will not send another while that one is
       * outstanding, so the same digits are still live when the box arrives;
       * if they have expired by then, the refusal that opens it sends
       * fresh ones. */
      const seen = refusals + 1;
      setError(
        refusal(failure, asksForCode, code, seen >= REFUSALS_BEFORE_CODE),
      );
      setRefusals(seen);
      setBusy(false);
    }
  }

  async function recover() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const used = await useRecoveryCode(
        email.trim(),
        password,
        recoveryCode.trim(),
      );
      /* Back to the ordinary form, which is where the person now has to
       * login: a recovery code is not a session and never will be. Both
       * halves are said, because somebody who is not told their second factor
       * is gone will believe they are still protected by it. */
      setRecovering(false);
      setRefusals(0);
      setCode("");
      setRecoveryCode("");
      setNotice(
        used.TwoFactorRemoved
          ? `Two-factor authentication is now off, and you have ${remaining(used.Remaining)}. Login with your password, then turn it back on from Security & Access.`
          : "That code was accepted. Login with your password.",
      );
    } catch (failure) {
      setError(
        failure instanceof RecoveryCodeError
          ? failure.message
          : "That recovery code was not accepted. Please try again.",
      );
    } finally {
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

        {/* Said after a recovery code is spent, which is the one moment this
         * card has good news that is not a completed login. */}
        {notice ? (
          <Alert severity="success" sx={{ mt: 2.5, borderRadius: 2 }}>
            {notice}
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
                  <ArrowRightIcon color="currentColor" size={20} />
                </IconButton>
              </InputAdornment>
            }
          />
        </FormControl>

        {/* The second step, in the same card: the password and the code are
         * one submission, because Keycloak's direct grant takes them together
         * and a page that asked for them in turn would be pretending it knew
         * the password was right. */}
        {asksForCode && !recovering ? (
          <FormControl fullWidth variant="outlined" sx={{ mt: 2.25 }}>
            <InputLabel htmlFor={codeId}>Verification code</InputLabel>
            <OutlinedInput
              id={codeId}
              /* Text rather than number: a code has leading zeros, and a
               * number box would eat them and offer spinners for digits
               * nobody is counting. */
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code from your app or text message"
              label={null}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))
              }
            />
          </FormControl>
        ) : null}

        {recovering ? (
          <FormControl fullWidth variant="outlined" sx={{ mt: 2.25 }}>
            <InputLabel htmlFor={recoveryId}>Recovery code</InputLabel>
            <OutlinedInput
              id={recoveryId}
              type="text"
              autoComplete="one-time-code"
              placeholder="One code from your saved list"
              label={null}
              value={recoveryCode}
              onChange={(event) => setRecoveryCode(event.target.value)}
              required
            />
          </FormControl>
        ) : null}

        {/* Only once the card has admitted it may be asking for a code. Shown
         * before then, it would be telling everybody who mistypes a password
         * about a feature they have not turned on. */}
        {asksForCode ? (
          <Typography
            variant="body2"
            sx={{ mt: 1.25, fontSize: "0.8rem", color: "text.secondary" }}
          >
            {recovering
              ? "Spending a code turns two-factor authentication off, and each code works once. "
              : "Lost the phone your codes arrive on? "}
            <Link
              component="button"
              type="button"
              underline="hover"
              onClick={() => {
                setRecovering(!recovering);
                setError(null);
                setNotice(null);
              }}
              sx={{ color: "primary.light", fontSize: "inherit" }}
            >
              {recovering ? "Back to the code" : "Use a recovery code"}
            </Link>
          </Typography>
        ) : null}

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
          {/* The third card. main-api mails the link and our own
           * /reset-password page takes it from there. */}
          <Link
            component="button"
            type="button"
            underline="hover"
            onClick={onForgotPassword}
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
          {recovering
            ? busy
              ? "Checking"
              : "Use recovery code"
            : busy
              ? "Signing in"
              : "Login"}
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
            onClick={onSignUp}
            sx={{ color: "primary.light", fontSize: "inherit" }}
          >
            Sign Up
          </Link>
        </Typography>
      </Box>
    </Dialog>
  );
}
