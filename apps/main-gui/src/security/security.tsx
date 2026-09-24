import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "../authentication";
import { CardSurface } from "../card-surface";
import { Toast, type Notice } from "../toast";
import { ActivityDialog } from "./activity-dialog";
import { ActivityList } from "./activity-list";
import { useSecurityActivity, type SecurityEvent } from "./activity-api";
import { EmailList } from "./email-list";
import { PasswordCard } from "./password-card";
import { usePassword } from "./password-api";
import type { ChangePasswordForm } from "./password-schema";
import { UserNameCard } from "./user-name-card";
import { PrivacyCard } from "./privacy-card";
import { useEmails, type UserEmail } from "./email-api";

/*
 * The security page, at /security-and-access, which is Security & Access in
 * the rail.
 *
 * What it holds today is the account's user name, its email addresses and its
 * recent activity: what the account is called, which addresses are on file,
 * which one is the login, which of them anybody has proved they can read, and
 * what has lately happened to the account. Passwords and sessions are
 * Keycloak's and are not here yet.
 *
 * The user name comes off the token rather than out of the API. It is on this
 * page to be read, so there is nothing to fetch for it: `useSession` already
 * holds what Keycloak said at sign-in.
 *
 * `notice` is how the page says something back: that an address was added,
 * that a link is on its way, or that the API refused. One at a time, which is
 * what `Toast` is for.
 */
export function Security() {
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

  /* Which row has a save in flight. One at a time is enough: every write
   * rewrites the whole list, so a second one started underneath the first
   * would be answering about a list that no longer exists. */
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

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
            ? "Your password was changed. Check Recent Activity below for any session that is still open."
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

      {/* Under the addresses and above the log, because the page is ordered by
       * what each block is: what the account is called, then everything about
       * getting into it that can be changed, then what has happened. A
       * password is the credential the addresses above it and the logins below
       * it both rest on, so it ends the first group rather than starting the
       * second. */}
      <PasswordCard
        sx={{ height: "auto", mt: { xs: 2, md: 2.5 } }}
        changedAt={changedAt}
        loading={loadingPassword}
        busy={changingPassword}
        onChange={(form, done) => void changing(form, done)}
      />

      {/* Under the addresses, because it is the record of what has been done to
       * them and to everything else about getting in: the page says what the
       * account is, then what can be changed about it, then what has changed.
       * The privacy switch stays last -- it is a preference rather than a way
       * in, and it is the one card that draws its own surface. */}
      <CardSurface
        title="Recent Activity"
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
          Logins, and the changes that alter how you get into your account. Open
          anything you do not recognize and tell us: we will send you a link to
          choose a new password.
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

      {/* The only card the page does not draw itself: the switch sits on the
       * card's title line, opposite EMAIL PRIVACY, so the card and the
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

      <Toast notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}

/* "1 session" or "3 sessions". Written out rather than left as "1 session(s)",
 * which is a sentence nobody would write by hand. */
function sessions(count: number): string {
  return count === 1 ? "1 session" : `${count} sessions`;
}
