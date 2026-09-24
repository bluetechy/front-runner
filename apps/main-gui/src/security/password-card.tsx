import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { useState } from "react";
import { PasswordChecklist } from "../authentication";
import { CardField, FieldRow } from "../card-field";
import { CardSurface } from "../card-surface";
import { useLanguage } from "../language";
import { occurredAt } from "./activity-time";
import {
  checkChangePassword,
  emptyChangePassword,
  type ChangePasswordForm,
} from "./password-schema";

/*
 * Changing the password, in a card headed CHANGE PASSWORD, between the
 * addresses and the activity.
 *
 * It sits there because the page is ordered by what each block is: what the
 * account is called, then everything about getting into it that can be
 * changed, then what has happened. A password is the credential the email
 * addresses above it and the logins below it both rest on, so it belongs with
 * the first group and at the end of it.
 *
 * **Three boxes, and the first one is the point of the card.** A session says
 * which account this is; it does not say who is at the keyboard. The current
 * password is what a browser somebody walked away from cannot produce, and
 * asking for it is the whole difference between this and the reset flow, which
 * proves the same thing by mailing a link to an address instead.
 *
 * The rules are shown as a checklist rather than as a sentence under the box,
 * and it is drawn before anybody types. A list of five requirements is a set
 * of instructions when it is standing there and a telling-off when it appears
 * after a refusal, and somebody choosing a password is better served by
 * knowing what is wanted than by finding out one rule at a time. It ticks as
 * they type, so the box is answering while it is being filled.
 *
 * Nothing in here is remembered. The three boxes are emptied the moment the
 * API says yes, and no password is put in any state that outlives the call:
 * see `password-api.tsx`, which holds none either.
 *
 * The stamp over the form is the last thing the identity provider did to this
 * password, which is a question people ask of a security page and one this
 * product could not answer before. It says nothing at all rather than "never"
 * where the provider would not say: every account's password was set at least
 * when the account was made, so "never" would be a sentence that is never true.
 */

/* Ids rather than `useId`, because the labels, the checklist and the boxes
 * have to agree and there are exactly three of them on one page. */
const FIELDS = {
  Current: "change-password-current",
  Password: "change-password-new",
  Confirm: "change-password-confirm",
} as const;

export function PasswordCard({
  changedAt,
  loading,
  busy,
  onChange,
  sx,
}: {
  changedAt: string | null;
  loading: boolean;
  busy: boolean;
  onChange: (form: ChangePasswordForm, done: () => void) => void;
  sx?: SxProps<Theme>;
}) {
  /* Read here rather than passed in, the way the activity list beside this
   * reads it: a date is written in the language the page is being read in,
   * and that is nobody's business but the thing writing the date. */
  const { language } = useLanguage();

  const [form, setForm] = useState<ChangePasswordForm>(emptyChangePassword);
  const [problems, setProblems] = useState<
    Partial<Record<keyof ChangePasswordForm, string>>
  >({});

  const set = (field: keyof ChangePasswordForm) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    /* The sentence under a box goes as soon as that box is being fixed:
     * leaving it there while somebody deals with it is scolding them for
     * something they are already dealing with. */
    setProblems((current) => ({ ...current, [field]: undefined }));
  };

  const submit = () => {
    const found = checkChangePassword(form);
    setProblems(found);
    if (Object.keys(found).length) return;
    /* The boxes are emptied by the page rather than here, and only when the
     * API has said yes: a form cleared on a refusal is one somebody has to
     * type again to find out what was wrong with it. */
    onChange(form, () => {
      setForm(emptyChangePassword);
      setProblems({});
    });
  };

  const when = changedAt ? occurredAt(changedAt, language.tag) : null;

  return (
    <CardSurface
      title="Change Password"
      sx={[
        /* `FieldRow` carries a margin for the rows that follow it. The last
         * row here is followed by the button, which brings its own space. */
        { "& form > :last-child": { marginBottom: 0 } },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Typography
        sx={{
          mb: 0.5,
          fontSize: "0.82rem",
          lineHeight: 1.7,
          color: (theme) => theme.palette.brand.cardInkMuted,
        }}
      >
        Your password is what every other way into this account rests on, so
        changing it asks for the one you use now as well as the one you want.
        That is what tells us it is you at the keyboard rather than somebody who
        found this page open. Changing it also ends every other session on the
        account, on every other device, and leaves this one running.
      </Typography>

      {/* The stamp. A line of its own under the paragraph rather than a field
       * in the form, because it is something the account knows rather than
       * something anybody is being asked for.
       *
       * It is left out entirely while the answer is on its way and where the
       * provider would not give one. A skeleton here would be a placeholder
       * for one line of text, which is more movement than the line is worth,
       * and "never" would be a sentence that is never true. */}
      {!loading && when ? (
        <Typography
          sx={{
            mb: 2,
            fontSize: "0.82rem",
            lineHeight: 1.7,
            fontWeight: 600,
            color: (theme) => theme.palette.brand.cardInk,
          }}
        >
          Last changed on {when.day} at {when.time}.
        </Typography>
      ) : (
        <Box sx={{ mb: 2 }} />
      )}

      <Box
        component="form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <FieldRow label="Current password" htmlFor={FIELDS.Current}>
          <CardField
            id={FIELDS.Current}
            type="password"
            /* What a password manager fills the box with, and what tells it
             * this form is a change rather than a login. */
            autoComplete="current-password"
            value={form.Current}
            onChange={set("Current")}
            error={problems.Current}
            hint="The password you login with today."
          />
        </FieldRow>

        <FieldRow label="New password" htmlFor={FIELDS.Password}>
          <CardField
            id={FIELDS.Password}
            type="password"
            autoComplete="new-password"
            value={form.Password}
            onChange={set("Password")}
            error={problems.Password}
          />
          {/* The rules the reset page and the sign-up dialog show, in the
           * card's own ink. One statement of them, one drawing of them: see
           * `password-checklist.tsx`. */}
          <PasswordChecklist password={form.Password} tone="card" />
        </FieldRow>

        <FieldRow label="New password again" htmlFor={FIELDS.Confirm}>
          <CardField
            id={FIELDS.Confirm}
            type="password"
            autoComplete="new-password"
            value={form.Confirm}
            onChange={set("Confirm")}
            error={problems.Confirm}
            hint="Type it a second time, so a typo cannot lock you out."
          />
        </FieldRow>

        <Stack direction="row" sx={{ justifyContent: "flex-end", mt: 2.5 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={busy}
            startIcon={
              busy ? <CircularProgress size={16} color="inherit" /> : undefined
            }
            sx={{
              fontFamily: "inherit",
              fontStyle: "normal",
              color: "common.white",
              backgroundImage: (theme) => theme.palette.brand.buttonGradient,
            }}
          >
            {busy ? "Changing your password" : "Change Password"}
          </Button>
        </Stack>
      </Box>
    </CardSurface>
  );
}
