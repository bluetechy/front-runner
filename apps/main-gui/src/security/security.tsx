import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  beginAccountLink,
  beginPasskeyRegistration,
  beginSecondFactorSetup,
  canConfigureSecondFactor,
  canRegisterPasskey,
  useSession,
} from "../authentication";
import { CardSurface } from "../card-surface";
import { Toast, type Notice } from "../toast";
import { ActivityDialog } from "./activity-dialog";
import { ActivityList } from "./activity-list";
import { useSecurityActivity, type SecurityEvent } from "./activity-api";
import { EmailList } from "./email-list";
import { PasswordCard } from "./password-card";
import { usePassword } from "./password-api";
import type { ChangePasswordForm } from "./password-schema";
import { ConnectionDialog, type ConnectionRequest } from "./connection-dialog";
import { PasskeyDialog, type PasskeyRequest } from "./passkey-dialog";
import { PasskeyList } from "./passkey-list";
import { usePasskeys, type Passkey } from "./passkey-api";
import { SsoList } from "./sso-list";
import { useSignInMethods, type SignInMethod } from "./sso-api";
import { TwoFactorDialog, type TwoFactorRequest } from "./two-factor-dialog";
import { TwoFactorList } from "./two-factor-list";
import { useTwoFactor, type TwoFactorMethod } from "./two-factor-api";
import { RecoveryCodesCard } from "./recovery-codes-card";
import { RecoveryCodesDialog } from "./recovery-codes-dialog";
import { SmsDialog } from "./sms-dialog";
import { UserNameCard } from "./user-name-card";
import { PrivacyCard } from "./privacy-card";
import { useEmails, type UserEmail } from "./email-api";

/*
 * The security page, at /security-and-access, which is Security & Access in
 * the rail.
 *
 * What it holds today is the account's user name, its email addresses, who is
 * shown them, its password, the passkeys that could stand in for one, and its
 * recent activity: what the account is called, which addresses are on file,
 * which one is the login, which of them anybody has proved they can read, when
 * the password last changed and how to change it, what could be used instead
 * of typing it, and what has lately happened to the account. The password and
 * the passkeys are both Keycloak's: this is where they are asked for, not
 * where they are kept.
 *
 * The user name comes off the token rather than out of the API. It is on this
 * page to be read, so there is nothing to fetch for it: `useSession` already
 * holds what Keycloak said at sign-in.
 *
 * `notice` is how the page says something back: that an address was added,
 * that a link is on its way, or that the API refused. One at a time, which is
 * what `Toast` is for.
 *
 * `connected`, `configured` and `passkey` are the three things this page is
 * told from outside, and all three arrive on the URL: the provider drops the
 * browser back here after a connection, after setting up a second factor, and
 * after registering a passkey. Each is a hint about what to go and check,
 * never a fact -- anybody can type one -- so the page hands each to the API,
 * which asks the provider before it believes a word of it. The third names
 * nothing, because there is nothing to name: an account holds a list of
 * passkeys rather than one row per kind, so all a returning browser can say
 * is that it went.
 */
export function Security({
  connected,
  configured,
  passkey,
}: {
  connected?: string;
  configured?: string;
  passkey?: string;
}) {
  const {
    addresses,
    isPrivate,
    loading,
    error,
    add,
    remove,
    setPrimary,
    resend,
    setPrivacy,
  } = useEmails();
  const {
    events,
    loading: loadingActivity,
    error: activityError,
    review,
  } = useSecurityActivity();
  const { identity } = useSession();
  const {
    changedAt,
    loading: loadingPassword,
    change: changePassword,
  } = usePassword();
  const {
    methods,
    loading: loadingMethods,
    error: methodsError,
    disconnect,
    confirm: confirmConnection,
  } = useSignInMethods();
  const {
    methods: factors,
    codes,
    loading: loadingFactors,
    error: factorsError,
    disable: disableFactor,
    confirm: confirmFactor,
    startSms,
    confirmSms,
    generate: generateCodes,
  } = useTwoFactor();
  const {
    passkeys,
    loading: loadingPasskeys,
    error: passkeysError,
    confirm: confirmPasskey,
    remove: removePasskey,
  } = usePasskeys();
  const navigate = useNavigate();

  /* Which row has a save in flight. One at a time is enough: every write
   * rewrites the whole list, so a second one started underneath the first
   * would be answering about a list that no longer exists. */
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  /* Which provider is being asked about, and whether its answer is in flight.
   * The request is held rather than an alias, so the dialog keeps drawing the
   * row it was opened on through its own closing transition. */
  const [connection, setConnection] = useState<ConnectionRequest | null>(null);
  const [busyAlias, setBusyAlias] = useState<string | null>(null);

  /* Which second factor is being asked about, and whether its answer is in
   * flight. The request is held rather than a kind, so the dialog keeps
   * drawing the row it was opened on through its own closing transition. */
  const [factorRequest, setFactorRequest] = useState<TwoFactorRequest | null>(
    null,
  );
  const [busyKind, setBusyKind] = useState<string | null>(null);

  /* Which passkey is being asked about, and whether its answer is in flight.
   * The request is held rather than an id, so the dialog keeps drawing the
   * row it was opened on through its own closing transition. Adding one is a
   * request too, with a null row on it: an account with no passkeys still
   * has a question to be asked before its page goes away. */
  const [passkeyRequest, setPasskeyRequest] = useState<PasskeyRequest | null>(
    null,
  );
  const [busyPasskey, setBusyPasskey] = useState<string | null>(null);
  /* And whether a trip out to register one has been started. Separate from
   * the id above rather than a sentinel in it, because a provider's handle
   * is an opaque string and a sentinel is a string it could one day be. */
  const [addingPasskey, setAddingPasskey] = useState(false);

  /* Attaching a phone number, which is the one factor that is set up on this
   * page rather than at the provider. Three pieces of state and they are the
   * whole of the dialog: whether it is open, the masked number the API says it
   * texted (null while the number box is the one showing), and whatever it
   * refused with. The refusal is held here rather than shown as a toast
   * because it belongs beside the box that caused it. */
  const [addingPhone, setAddingPhone] = useState(false);
  const [textedTo, setTextedTo] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  /* The ten codes, for as long as the dialog showing them is open, and never
   * anywhere else. They are held here rather than in the hook because this is
   * the only thing that shows them: the API keeps hashes, so once this is
   * null they are gone for good. */
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [makingCodes, setMakingCodes] = useState(false);

  /* Which event the dialog is looking at, and whether its answer is in flight.
   * The event is held rather than an id, so the dialog keeps drawing the row it
   * was opened on through its own closing transition; it is cleared by the
   * dialog closing rather than by the list being replaced underneath it. */
  const [viewing, setViewing] = useState<SecurityEvent | null>(null);
  /* Which answer is in flight, rather than whether one is: the dialog spins
   * the button that was pressed, and two spinning at once would say it had not
   * heard which. Null is nothing in flight. */
  const [answering, setAnswering] = useState<boolean | null>(null);

  function report(failure: unknown, fallback: string) {
    setNotice({
      message: failure instanceof Error ? failure.message : fallback,
      tone: "error",
    });
  }

  /* Written out as a function rather than a chain off the card, because the
   * card is told to empty its boxes on the way through and a callback inside a
   * `then` is the one shape this page does not use anywhere. Awaiting it puts
   * the two in the order they are read in. */
  async function changing(form: ChangePasswordForm, done: () => void) {
    setChangingPassword(true);
    try {
      const changed = await changePassword(form.Current, form.Password);
      /* The boxes are emptied here rather than in the card, and only on a yes:
       * a form cleared by a refusal is one somebody has to type again to find
       * out what was wrong with it. */
      done();
      setNotice({
        /* Two things happened and the sentence says both, the way the
         * primary-address one does. Somebody who is not told their other
         * sessions were ended will wonder why a phone in their pocket has
         * asked them to login again.
         *
         * Null is not zero. Zero means there were none, which is worth saying;
         * null means the password changed and we could not then say what
         * happened to the sessions, and reporting that as "no other sessions"
         * would tell somebody to stop looking. */
        message:
          changed.OtherSessionsEnded === null
            ? "Your password was changed. Check Recent Activity Log below for any session that is still open."
            : changed.OtherSessionsEnded > 0
              ? `Your password was changed, and ${sessions(changed.OtherSessionsEnded)} on your other devices ended.`
              : "Your password was changed. There were no other sessions open.",
        tone: "success",
      });
    } catch (failure: unknown) {
      report(failure, "Your password was not changed.");
    } finally {
      setChangingPassword(false);
    }
  }

  /*
   * The browser is back from a provider, and the URL says which one.
   *
   * It runs once. The alias is taken off the URL before the call is made, so a
   * reload cannot ask the question twice, and the ref covers StrictMode's
   * second pass in development, which would otherwise record one connection as
   * two.
   *
   * What it says back comes from the API's answer rather than from the URL: a
   * trip somebody abandoned at Google comes back here the same way a finished
   * one does, and the only difference between them is what the provider says
   * when it is asked.
   */
  const confirmed = useRef<string | null>(null);
  useEffect(() => {
    if (!connected || confirmed.current === connected) return;
    confirmed.current = connected;

    /* Off the URL first: what is on the address bar is a claim, and leaving it
     * there would have a refresh make it again. */
    void navigate({ to: "/security-and-access", replace: true });

    confirmConnection(connected)
      .then((method) =>
        setNotice(
          method?.Connected
            ? {
                message: `${method.Name} is now connected to your account. You can login with it from now on.`,
                tone: "success",
              }
            : {
                message:
                  "That connection was not finished, so nothing has changed. You can try it again from the Single Sign-On card.",
                tone: "error",
              },
        ),
      )
      /* Said here rather than through `report`, which is rebuilt on every
       * render and would have this effect run again every time it did. The
       * sentence is the same one `report` would have chosen. */
      .catch((failure: unknown) =>
        setNotice({
          message:
            failure instanceof Error
              ? failure.message
              : "That connection could not be checked.",
          tone: "error",
        }),
      );
  }, [connected, confirmConnection, navigate]);

  /*
   * The browser is back from the provider's setup page, and the URL says
   * which factor it went to set up.
   *
   * The same shape as `connected` above, and the same reasoning: it runs
   * once, the kind comes off the URL before the call is made so a reload
   * cannot ask twice, and the ref covers StrictMode's second pass in
   * development.
   *
   * What it says back comes from the API's answer rather than from the URL.
   * The provider puts its own status on the return trip -- Keycloak writes
   * kc_action_status -- and it is not read here: somebody who abandoned the
   * QR code comes back the same way as somebody who scanned it, and the only
   * difference between them is what the provider says when it is asked.
   */
  const checked = useRef<string | null>(null);
  useEffect(() => {
    if (!configured || checked.current === configured) return;
    checked.current = configured;

    void navigate({ to: "/security-and-access", replace: true });

    confirmFactor(configured)
      .then((method) =>
        setNotice(
          method?.Configured
            ? {
                /* Both halves, because the second is what somebody has to do
                 * next and the moment they will not come back for it is the
                 * moment they think they are finished. */
                message: `${method.Name} is on. Logging in will ask for a code from now on: make a set of recovery codes below in case you lose it.`,
                tone: "success",
              }
            : {
                message:
                  "That setup was not finished, so nothing has changed. You can start it again from the Two-Factor Authentication card.",
                tone: "error",
              },
        ),
      )
      /* Said here rather than through `report`, which is rebuilt on every
       * render and would have this effect run again every time it did. */
      .catch((failure: unknown) =>
        setNotice({
          message:
            failure instanceof Error
              ? failure.message
              : "That setup could not be checked.",
          tone: "error",
        }),
      );
  }, [configured, confirmFactor, navigate]);

  /*
   * The browser is back from the provider's passkey registration page.
   *
   * The same shape as the two above, and the same reasoning: it runs once,
   * the claim comes off the URL before the call is made so a reload cannot
   * ask twice, and the ref covers StrictMode's second pass in development.
   *
   * The claim on the URL is thinner than the other two carry -- it names
   * nothing, because there is nothing to name -- and a claim that a passkey
   * *was* registered is believed no more than theirs are: the API is asked
   * what the account actually holds.
   *
   * `cancelled` is the exception, and it is not a claim worth checking. It is
   * the provider's own `kc_action_status`, carried here by `passkeyReturnPath`,
   * and it means the browser's dialog was dismissed: there is nothing to go
   * and read, nothing to record, and a round trip would answer with the list
   * the page already has. The worst a forged one can do is say nothing
   * changed above a list that shows otherwise.
   */
  const asked = useRef<string | null>(null);
  useEffect(() => {
    if (!passkey || asked.current === passkey) return;
    asked.current = passkey;

    void navigate({ to: "/security-and-access", replace: true });

    /* `cancelled` is an answer already, so it stands in for one rather than
     * branching around the rest of this: it lands on the same sentence the
     * API's own no lands on, which is the sentence to say either way. */
    (passkey === "cancelled" ? Promise.resolve(false) : confirmPasskey())
      .then((registered) =>
        setNotice(
          registered
            ? {
                /* Both halves, because the second is the thing somebody
                 * will not come back for once they believe they are
                 * finished: a passkey is tied to the device that made it,
                 * and a phone is where most people actually login. */
                message:
                  "Your passkey was added. It works on this device only: add one on your phone as well from the same card.",
                tone: "success",
              }
            : {
                message:
                  "That passkey was not added, so nothing has changed. You can try it again from the Passkeys card.",
                tone: "error",
              },
        ),
      )
      /* Said here rather than through `report`, which is rebuilt on every
       * render and would have this effect run again every time it did. */
      .catch((failure: unknown) =>
        setNotice({
          message:
            failure instanceof Error
              ? failure.message
              : "That passkey could not be checked.",
          tone: "error",
        }),
      );
  }, [passkey, confirmPasskey, navigate]);

  /* Connecting leaves the page: the browser goes to the identity provider,
   * then to the provider itself, and comes back to this route with the alias
   * on the URL. Nothing here waits for it, because there is nothing to wait
   * for -- the page is gone the moment it starts. The row is only left busy so
   * that a second press cannot start a second trip. */
  async function connecting(request: ConnectionRequest) {
    setBusyAlias(request.method.Alias);
    try {
      await beginAccountLink(request.method.Alias);
    } catch (failure: unknown) {
      report(failure, `We could not reach ${request.method.Name}.`);
      setConnection(null);
      setBusyAlias(null);
    }
  }

  async function disconnecting(request: ConnectionRequest) {
    setBusyAlias(request.method.Alias);
    try {
      await disconnect(request.method.Alias);
      setConnection(null);
      setNotice({
        /* Two things happened and the sentence says both, the way the
         * primary-address one does: what stopped working, and what did not.
         * Somebody who is not told the rest still works will assume they have
         * just locked themselves out.
         *
         * "Everything else you login with" rather than "your password",
         * because an account that arrived through a provider may never have
         * had one and would read the reassurance as a lie. */
        message: `${request.method.Name} was disconnected. Everything else you login with still works.`,
        tone: "success",
      });
    } catch (failure: unknown) {
      report(failure, `${request.method.Name} was not disconnected.`);
    } finally {
      setBusyAlias(null);
    }
  }

  /* Turning a factor on leaves the page: the browser goes to the identity
   * provider's own setup page and comes back to this route with the kind on
   * the URL. Nothing here waits for it, because there is nothing to wait for
   * -- the page is gone the moment it starts. The row is only left busy so
   * that a second press cannot start a second trip. The same shape as
   * connecting a provider, above. */
  /* The SMS dialog, from the row. Opened straight rather than behind the
   * confirmation the other kinds get: nothing is lost by opening it, the page
   * does not go anywhere, and the warning that would have been in a
   * confirmation is in the dialog itself, beside the box. */
  function startAddingPhone() {
    setTextedTo(null);
    setPhoneError(null);
    setAddingPhone(true);
  }

  async function enabling(request: TwoFactorRequest) {
    setBusyKind(request.method.Kind);
    try {
      await beginSecondFactorSetup(request.method.Kind);
    } catch (failure: unknown) {
      report(failure, "We could not reach the identity provider.");
      setFactorRequest(null);
      setBusyKind(null);
    }
  }

  /* The first half: a code goes to a number somebody typed, and nothing at
   * all changes on the account. What comes back is the number as the API
   * masked it, which is what the dialog reads out while it waits. */
  async function textingCode(phoneNumber: string) {
    setBusyKind("sms");
    setPhoneError(null);
    try {
      const started = await startSms(phoneNumber);
      setTextedTo(started.PhoneNumber);
    } catch (failure: unknown) {
      setPhoneError(
        failure instanceof Error
          ? failure.message
          : "That code could not be sent.",
      );
    } finally {
      setBusyKind(null);
    }
  }

  /* The second half, and the only half that writes anything. The code goes up
   * on its own: which number it proves is the API's answer rather than
   * anything this page could claim. */
  async function confirmingCode(code: string) {
    setBusyKind("sms");
    setPhoneError(null);
    try {
      await confirmSms(code);
      setAddingPhone(false);
      setTextedTo(null);
      setNotice({
        /* Both halves, as the returning-from-the-provider notice says both:
         * what happens now, and the thing somebody will not come back for
         * once they believe they are finished. */
        message:
          "Text messages are on. Logging in will ask for a code from now on: make a set of recovery codes below in case you lose the phone.",
        tone: "success",
      });
    } catch (failure: unknown) {
      setPhoneError(
        failure instanceof Error
          ? failure.message
          : "That code was not accepted.",
      );
    } finally {
      setBusyKind(null);
    }
  }

  async function disabling(request: TwoFactorRequest) {
    setBusyKind(request.method.Kind);
    try {
      await disableFactor(request.method.Kind);
      setFactorRequest(null);
      setNotice({
        /* Two things happened and the sentence says both, the way the
         * disconnect one does: what stopped being asked for, and what the
         * account now stands on. Somebody who is not told that is left
         * thinking they are still protected by something. */
        message: `${request.method.Name} is off. Your account is protected by its password alone.`,
        tone: "success",
      });
    } catch (failure: unknown) {
      report(failure, `${request.method.Name} was not turned off.`);
    } finally {
      setBusyKind(null);
    }
  }

  /* Adding a passkey leaves the page: the browser goes to the identity
   * provider's own registration page, the ceremony happens there, and the
   * browser comes back to this route with the claim on the URL. Nothing here
   * waits for it, because there is nothing to wait for -- the page is gone
   * the moment it starts. The dialog is only left busy so that a second
   * press cannot start a second trip. The same shape as connecting a
   * provider and as turning a factor on, above. */
  async function addingAPasskey() {
    setAddingPasskey(true);
    try {
      await beginPasskeyRegistration();
    } catch (failure: unknown) {
      report(failure, "We could not reach the identity provider.");
      setPasskeyRequest(null);
      setAddingPasskey(false);
    }
  }

  async function removingPasskey(request: PasskeyRequest) {
    /* Never reached with a null row: the dialog only offers Remove for a
     * row it was opened on. Answered rather than asserted, because a throw
     * here would be a page breaking over a case that cannot happen. */
    if (!request.passkey) return;
    const going = request.passkey;
    setBusyPasskey(going.Id);
    try {
      await removePasskey(going.Id);
      setPasskeyRequest(null);
      setNotice({
        /* Two things happened and the sentence says both, the way the
         * disconnect one does: what stopped working, and what did not.
         * Somebody who is not told the rest still works will assume they
         * have just locked themselves out. */
        message: `${going.Label ? `"${going.Label}"` : "That passkey"} was removed. Your password and anything you have connected still work.`,
        tone: "success",
      });
    } catch (failure: unknown) {
      report(failure, "That passkey was not removed.");
    } finally {
      setBusyPasskey(null);
    }
  }

  /* The one call on this page whose answer is a secret. It goes straight into
   * the dialog and nowhere else: no toast quoting it, no state that outlives
   * the dialog, nothing written down. */
  async function makingRecoveryCodes() {
    setMakingCodes(true);
    try {
      setNewCodes(await generateCodes());
    } catch (failure: unknown) {
      report(failure, "Your recovery codes were not made.");
    } finally {
      setMakingCodes(false);
    }
  }

  async function act(
    address: UserEmail,
    run: () => Promise<unknown>,
    done: string,
  ) {
    setBusyId(address.UserEmailUUID);
    try {
      await run();
      setNotice({ message: done, tone: "success" });
    } catch (failure: unknown) {
      report(failure, "The email address list was not changed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Stack sx={{ marginBottom: { xs: 2, md: 2.5 } }}>
        <Typography
          variant="h2"
          sx={{ fontSize: "clamp(1.6rem, 3vw, 2.1rem)" }}
        >
          Security &amp; Access
        </Typography>
        <Stack
          direction="row"
          sx={{ gap: 0.75, mt: 0.5, fontSize: "0.82rem", alignItems: "center" }}
        >
          <Typography
            component={Link}
            to="/dashboard"
            sx={{
              fontSize: "inherit",
              color: "primary.light",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Dashboard
          </Typography>
          <Typography
            component="span"
            sx={{ fontSize: "inherit", color: "text.secondary" }}
          >
            &rsaquo;
          </Typography>
          <Typography
            component="span"
            sx={{ fontSize: "inherit", color: "text.secondary" }}
          >
            Security &amp; Access
          </Typography>
        </Stack>
      </Stack>

      {/* Above the addresses, because it is the one identifier on the page
       * that never changes: what the account is called, and then everything
       * about it that can be added to, removed and moved. */}
      <UserNameCard
        sx={{ height: "auto", mb: { xs: 2, md: 2.5 } }}
        userName={identity?.loginName ?? ""}
      />

      <CardSurface title="Email Addresses" sx={{ height: "auto" }}>
        {/* The list could not be read at all, which is a different thing from
         * an empty one and has to say so rather than look like one. */}
        {error ? (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        ) : null}

        <Typography
          sx={{
            mb: 1,
            fontSize: "0.82rem",
            lineHeight: 1.7,
            color: (theme) => theme.palette.brand.cardInkMuted,
          }}
        >
          The email address marked primary is the one you login with. An email
          address has to be verified before it can take that mark, so we send a
          link to every one you add and the link works once.
        </Typography>

        <EmailList
          addresses={addresses}
          loading={loading}
          busyId={busyId}
          adding={adding}
          onChoosePrimary={(address) =>
            void act(
              address,
              () => setPrimary(address.UserEmailUUID),
              /* Two things happened and the sentence says both: this
               * application's copy changed, and so did the credential at the
               * identity provider. Somebody who is not told the second will
               * try their old address next time. */
              `You will login with ${address.Email} from now on.`,
            )
          }
          onRemove={(address) =>
            void act(
              address,
              () => remove(address.UserEmailUUID),
              `${address.Email} was removed.`,
            )
          }
          onResend={(address) =>
            void act(
              address,
              () => resend(address.UserEmailUUID),
              /* The old link stops working the moment this runs, and somebody
               * looking at two messages in an inbox needs to know which one to
               * open. */
              `A new link is on its way to ${address.Email}. Any earlier link has stopped working.`,
            )
          }
          onAdd={(email) => {
            setAdding(true);
            add(email)
              .then(() =>
                setNotice({
                  message: `${email} was added. Open the link we sent it to verify the email address.`,
                  tone: "success",
                }),
              )
              .catch((failure: unknown) =>
                report(failure, "The email address was not added."),
              )
              .finally(() => setAdding(false));
          }}
        />
      </CardSurface>

      {/* Directly under the addresses, because it is a setting about them:
       * the table above says which addresses are on file, and this says
       * whether the other members are shown the one you login with. Reading
       * the list and then reading who else can see it is one thought, and it
       * was two scrolls apart while this card sat at the foot of the page.
       *
       * It is the only card the page does not draw itself: the switch sits on
       * the card's title line, opposite EMAIL PRIVACY, so the card and the
       * control are one component. The space between the two cards is still
       * the page's to set. */}
      <PrivacyCard
        sx={{ height: "auto", mt: { xs: 2, md: 2.5 } }}
        isPrivate={isPrivate}
        busy={savingPrivacy || loading}
        onChange={(next) => {
          setSavingPrivacy(true);
          setPrivacy(next)
            .then((saved) =>
              setNotice({
                /* Neither sentence says "again". Public is the state somebody
                 * opts into, so for most accounts this is the first time the
                 * address has been in that list at all. */
                message: saved
                  ? "Your email address is now hidden from the members list."
                  : "Your email address is now shown in the members list.",
                tone: "success",
              }),
            )
            .catch((failure: unknown) =>
              report(failure, "The setting was not saved."),
            )
            .finally(() => setSavingPrivacy(false));
        }}
      />

      {/* Under the addresses and their setting, and above the log, because the
       * page is ordered by what each block is: what the account is called,
       * then everything about getting into it that can be changed, then what
       * has happened. A password is the credential the addresses above it and
       * the logins below it both rest on, so it ends the first group rather
       * than starting the second. */}
      <PasswordCard
        sx={{ height: "auto", mt: { xs: 2, md: 2.5 } }}
        changedAt={changedAt}
        loading={loadingPassword}
        busy={changingPassword}
        onChange={(form, done) => void changing(form, done)}
      />

      {/* Directly under the password, because it is the alternative to one:
       * the card above changes the password an account logs in with, and
       * this is what would replace typing it. Everything below is a way of
       * asking for something *as well as* a password, which is a different
       * subject and comes after. */}
      <CardSurface
        title="Passkeys"
        sx={{ height: "auto", mt: { xs: 2, md: 2.5 } }}
        action={
          /* On the title line rather than under the list, because it is the
           * only thing to do on a card most accounts arrive at empty, and
           * because a button that moves down the card as rows are added is a
           * button people hunt for.
           *
           * Nothing at all where this deployment cannot ask the provider for
           * the registration action, rather than a button that goes nowhere:
           * the two-factor card's rule, and the SSO card's before it. */
          canRegisterPasskey() ? (
            <Button
              type="button"
              variant="outlined"
              size="small"
              disabled={addingPasskey}
              onClick={() =>
                setPasskeyRequest({ passkey: null, action: "add" })
              }
              sx={{ fontFamily: "inherit", fontStyle: "normal" }}
            >
              Add passkey
            </Button>
          ) : undefined
        }
      >
        {/* The list could not be read at all, which is a different thing
         * from an account with no passkeys and must not look like one. */}
        {passkeysError ? (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {passkeysError}
          </Alert>
        ) : null}

        <Typography
          sx={{
            mb: 1,
            fontSize: "0.82rem",
            lineHeight: 1.7,
            color: (theme) => theme.palette.brand.cardInkMuted,
          }}
        >
          A passkey logs you in with your face, your fingerprint or a security
          key instead of a password. The key itself never leaves the device that
          made it, so there is nothing to phish and nothing for us to lose, and
          each device needs its own.
        </Typography>

        {/* Said on the card rather than left for somebody to discover at the
         * login box. A credential this product cannot yet spend is still
         * worth registering -- it is waiting for the login card, not for the
         * account -- but a card that let somebody believe they could stop
         * typing their password today would be a card that lied. See
         * docs/TODO.md. */}
        <Typography
          sx={{
            mb: 1.5,
            fontSize: "0.82rem",
            lineHeight: 1.7,
            color: (theme) => theme.palette.brand.cardInkMuted,
          }}
        >
          Our own login box cannot use one yet: it asks for an email address and
          a password directly. Until it can, a passkey you add here works when
          you login at our identity provider's own page, and is waiting for the
          rest.
        </Typography>

        <PasskeyList
          passkeys={passkeys}
          loading={loadingPasskeys}
          failed={passkeysError !== null}
          busyId={busyPasskey}
          onRemove={(row: Passkey) =>
            setPasskeyRequest({ passkey: row, action: "remove" })
          }
        />
      </CardSurface>

      {/* Under the passkeys, because it is the same subject one step further
       * out: the two cards above are ways this account proves itself, and
       * these are the ways somebody else proves it. All of them are
       * credentials, so they sit together, and the ones this application can
       * actually change come first. */}
      <CardSurface
        title="Single Sign-On (SSO)"
        sx={{ height: "auto", mt: { xs: 2, md: 2.5 } }}
      >
        {/* The list could not be read at all, which is a different thing from
         * a site that offers nothing and must not look like one. */}
        {methodsError ? (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {methodsError}
          </Alert>
        ) : null}

        <Typography
          sx={{
            mb: 1,
            fontSize: "0.82rem",
            lineHeight: 1.7,
            color: (theme) => theme.palette.brand.cardInkMuted,
          }}
        >
          Connect an account you already have somewhere else and you can login
          with it instead of typing a password. Connecting one replaces nothing:
          it is another way in, and you can take it away again here.
        </Typography>

        <SsoList
          methods={methods}
          loading={loadingMethods}
          failed={methodsError !== null}
          busyAlias={busyAlias}
          onConnect={(method: SignInMethod) =>
            setConnection({ method, action: "connect" })
          }
          onDisconnect={(method: SignInMethod) =>
            setConnection({ method, action: "disconnect" })
          }
        />
      </CardSurface>

      {/* Under the providers, because it is the same subject one step in:
       * those are other ways in, and this is the thing asked for after the
       * way in has been used. It is also the last control on the page that
       * changes how somebody logs in, which is why the log comes after it. */}
      <CardSurface
        title="Two-Factor Authentication"
        sx={{ height: "auto", mt: { xs: 2, md: 2.5 } }}
      >
        {/* The list could not be read at all, which is a different thing from
         * an account with no second factor and must not look like one. */}
        {factorsError ? (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {factorsError}
          </Alert>
        ) : null}

        <Typography
          sx={{
            mb: 1,
            fontSize: "0.82rem",
            lineHeight: 1.7,
            color: (theme) => theme.palette.brand.cardInkMuted,
          }}
        >
          A second factor is something you have as well as something you know,
          so a stolen password is not enough on its own. An authenticator app is
          set up at our identity provider, by scanning a code; a phone number is
          set up here, by answering a message we text to it. Either way, logging
          in asks for six digits as well as your password from then on.
        </Typography>

        <TwoFactorList
          methods={factors}
          loading={loadingFactors}
          failed={factorsError !== null}
          busyKind={busyKind}
          canEnable={canConfigureSecondFactor}
          onEnable={(method: TwoFactorMethod) =>
            /* SMS asks its own question, in its own dialog: there is nothing
             * to warn somebody about before it, because it does not leave the
             * page and nothing changes until a code comes back. Everything
             * else goes through the confirmation first, because pressing it
             * takes the page away. */
            method.Kind === "sms"
              ? startAddingPhone()
              : setFactorRequest({ method, action: "enable" })
          }
          onDisable={(method: TwoFactorMethod) =>
            setFactorRequest({ method, action: "disable" })
          }
        />
      </CardSurface>

      {/* Directly under it, because it is the other half of the same
       * decision: what happens on the day you cannot answer the thing above.
       * The same arrangement the privacy switch has under the addresses. */}
      <RecoveryCodesCard
        sx={{ height: "auto", mt: { xs: 2, md: 2.5 } }}
        status={codes}
        loading={loadingFactors}
        busy={makingCodes}
        hasSecondFactor={factors.some((method) => method.Configured)}
        onGenerate={() => void makingRecoveryCodes()}
      />

      {/* Last, because it is the record of what has been done to the addresses
       * and to everything else about getting in: the page says what the
       * account is, then what can be changed about it, then what has changed.
       * Nothing on it is a control, which is the other reason it is the block
       * a page of settings ends on. */}
      <CardSurface
        title="Recent Activity Log"
        sx={{ height: "auto", mt: { xs: 2, md: 2.5 } }}
      >
        {/* The log could not be read at all, which is a different thing from an
         * empty one and has to say so rather than look like one. */}
        {activityError ? (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {activityError}
          </Alert>
        ) : null}

        <Typography
          sx={{
            mb: 1,
            fontSize: "0.82rem",
            lineHeight: 1.7,
            color: (theme) => theme.palette.brand.cardInkMuted,
          }}
        >
          The last 30 days of logins, and of the changes that alter how you get
          into your account. Open anything you do not recognize and tell us: we
          will send you a link to choose a new password.
        </Typography>

        <ActivityList
          events={events}
          loading={loadingActivity}
          failed={activityError !== null}
          busyId={
            answering === null ? null : (viewing?.SecurityEventUUID ?? null)
          }
          onOpen={(event) => setViewing(event)}
        />
      </CardSurface>

      <ConnectionDialog
        request={connection}
        busy={busyAlias !== null}
        onClose={() => setConnection(null)}
        onConfirm={(request) =>
          void (request.action === "connect"
            ? connecting(request)
            : disconnecting(request))
        }
      />

      <TwoFactorDialog
        request={factorRequest}
        busy={busyKind !== null}
        hasRecoveryCodes={codes.Remaining > 0}
        onClose={() => setFactorRequest(null)}
        onConfirm={(request) =>
          void (request.action === "enable"
            ? enabling(request)
            : disabling(request))
        }
      />

      <PasskeyDialog
        request={passkeyRequest}
        busy={addingPasskey || busyPasskey !== null}
        onClose={() => setPasskeyRequest(null)}
        onConfirm={(request) =>
          void (request.action === "add"
            ? addingAPasskey()
            : removingPasskey(request))
        }
      />

      <SmsDialog
        open={addingPhone}
        busy={busyKind === "sms"}
        error={phoneError}
        sentTo={textedTo}
        onClose={() => {
          setAddingPhone(false);
          setTextedTo(null);
          setPhoneError(null);
        }}
        onBack={() => {
          setTextedTo(null);
          setPhoneError(null);
        }}
        onSend={(phoneNumber) => void textingCode(phoneNumber)}
        onConfirm={(code) => void confirmingCode(code)}
      />

      {/* The one dialog on this page that is not closed by the backdrop: the
       * codes behind it are shown once, and a stray click would throw away
       * somebody's way back into their own account. */}
      <RecoveryCodesDialog codes={newCodes} onClose={() => setNewCodes(null)} />

      <ActivityDialog
        event={viewing}
        pending={answering}
        onClose={() => setViewing(null)}
        onAnswer={(event, recognized) => {
          setAnswering(recognized);
          review(event.SecurityEventUUID, recognized)
            .then(() => {
              setViewing(null);
              setNotice({
                /* Two different things happened, so they are two different
                 * sentences. "Yes" is a note taken; "no" has already sent a
                 * message, and somebody who is not told to expect it will not
                 * know to go and open it. */
                message: recognized
                  ? "Thanks. We have marked that activity as recognized."
                  : "A link to choose a new password is on its way to your login email address.",
                tone: "success",
              });
            })
            .catch((failure: unknown) =>
              report(failure, "That activity was not answered."),
            )
            .finally(() => setAnswering(null));
        }}
      />

      <Toast notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}

/* "1 session" or "3 sessions". Written out rather than left as "1 session(s)",
 * which is a sentence nobody would write by hand. */
function sessions(count: number): string {
  return count === 1 ? "1 session" : `${count} sessions`;
}
