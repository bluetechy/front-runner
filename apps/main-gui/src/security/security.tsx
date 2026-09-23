import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "../authentication";
import { CardSurface } from "../card-surface";
import { Toast, type Notice } from "../toast";
import { EmailList } from "./email-list";
import { UserNameCard } from "./user-name-card";
import { PrivacyCard } from "./privacy-card";
import { useEmails, type UserEmail } from "./email-api";

/*
 * The security page, at /security-and-access, which is Security & Access in
 * the rail.
 *
 * What it holds today is the account's user name and its email addresses:
 * what the account is called, which addresses are on file, which one is the
 * login, and which of them anybody has proved they can read. Passwords and
 * sessions are Keycloak's and are not here yet.
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
  const { identity } = useSession();

  /* Which row has a save in flight. One at a time is enough: every write
   * rewrites the whole list, so a second one started underneath the first
   * would be answering about a list that no longer exists. */
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  function report(failure: unknown, fallback: string) {
    setNotice({
      message: failure instanceof Error ? failure.message : fallback,
      tone: "error",
    });
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
      report(failure, "The address list was not changed.");
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
          The address marked primary is the one you login with. An address has
          to be verified before it can take that mark, so we send a link to
          every address you add and the link works once.
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
                  message: `${email} was added. Open the link we sent it to verify the address.`,
                  tone: "success",
                }),
              )
              .catch((failure: unknown) =>
                report(failure, "The address was not added."),
              )
              .finally(() => setAdding(false));
          }}
        />
      </CardSurface>

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
                  ? "Your address is now hidden from the members list."
                  : "Your address is now shown in the members list.",
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
