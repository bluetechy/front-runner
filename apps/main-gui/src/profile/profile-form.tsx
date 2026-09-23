import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CardLabel, CardSurface } from "../card-surface";
import { useSession, type Identity } from "../authentication";
import type { ToastTone } from "../toast";
import { CardField, FieldRow } from "../card-field";
import { useProfile, type StoredProfile } from "./profile-api";
import {
  errorsOf,
  genders,
  type FieldErrors,
  type Profile,
} from "./profile-schema";

/*
 * The profile as a form: what is loaded from the API, edited here, checked
 * against the same rules the API enforces, and written back.
 *
 * One field is shown and not editable. "Email" belongs to Keycloak --
 * dbo.ProvisionUser copies it out of the token on every sign-in -- so a value
 * typed here would last until the next sign-in and no longer. It is on the
 * form because a profile that did not show it would look like it had lost it.
 *
 * "User name" was the other one. It moved to the security page, under USER
 * HANDLE, where the account's own identifiers live: it is the name somebody
 * signs in with rather than anything they wrote about themselves.
 *
 * Everything the form *says* goes through `t()`. Nothing it *stores* does:
 * a gender is written to the database as "Male", and the Spanish label above
 * that option is a label. The five social fields keep their names in every
 * language, because Facebook is called Facebook in Spanish.
 */

/* The blank the form starts from before the API answers. */
const EMPTY: Profile = {
  FirstName: "",
  LastName: "",
  NickName: "",
  Designation: "",
  Biography: "",
  Gender: "Not specified",
  BirthDate: "",
  Phone: "",
  Address: "",
  Facebook: "",
  Github: "",
  LinkedIn: "",
  TikTok: "",
  Twitter: "",
  WantsAwardEmails: true,
  WantsDigestEmails: false,
};

/*
 * The date of birth is held, checked and sent the way the API writes it --
 * `1990-04-17` -- and shown the way this form was asked to show it. The
 * separator is the whole of the difference between the two, so they convert
 * by swapping it, and a half-typed date crosses unchanged: the schema stays
 * the one thing that says whether what is in the field is a day.
 *
 * The mask is not translated, for the same reason the message it echoes is
 * not: it stands for four digits and two pairs of them, and a person typing
 * a date types the same characters in either language.
 */
const BIRTH_DATE_MASK = "YYYY/MM/DD";

const shownDate = (birthDate: string) => birthDate.replaceAll("-", "/");
const storedDate = (typed: string) => typed.replaceAll("/", "-");

/*
 * What the form opens with: the stored profile, with one exception. A profile
 * nobody has saved has no first or last name, and the token carries one name
 * for both -- so the first visit is offered the token's name split at its last
 * space, which is a starting point rather than a record. Anything already
 * stored wins over it.
 */
function seed(stored: StoredProfile, identity: Identity | null): Profile {
  const whole = (identity?.name ?? "").trim();
  const cut = whole.lastIndexOf(" ");
  const { UserUUID: _ignored, ...profile } = stored;

  return {
    ...profile,
    /* Nobody has given one: the field is empty rather than absent, because
     * that is what an input holds. */
    BirthDate: profile.BirthDate ?? "",
    FirstName: profile.FirstName || (cut === -1 ? whole : whole.slice(0, cut)),
    LastName: profile.LastName || (cut === -1 ? "" : whole.slice(cut + 1)),
  };
}

export function ProfileForm({
  onNotice,
}: {
  onNotice: (message: string, tone?: ToastTone) => void;
}) {
  const { identity } = useSession();
  const { profile, loading, save } = useProfile();
  const { t } = useTranslation();
  const [form, setForm] = useState<Profile>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  /* Seeded once, when the profile first arrives: doing it on every change
   * would throw away what is being typed while a save is in flight. */
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !profile) return;
    seeded.current = true;
    setForm(seed(profile, identity));
  }, [profile, identity]);

  function set<Field extends keyof Profile>(
    field: Field,
    value: Profile[Field],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    /* A field stops complaining as soon as it is touched; it is checked
     * again on submit. */
    setErrors((current) =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
  }

  async function submit() {
    const found = errorsOf(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      onNotice(
        t("Some fields need another look — see the messages on them."),
        "error",
      );
      return;
    }

    setSaving(true);
    try {
      await save(form);
      onNotice(t("Profile saved."), "success");
    } catch (failure: unknown) {
      /* The API is the authority. If it refused something this form let
       * through, its message is the one worth showing -- in the language the
       * API wrote it in, which is English. Translating a message this side
       * would mean holding a copy of every sentence main-api can produce,
       * and the copy would be the one that went stale. */
      onNotice(
        failure instanceof Error
          ? failure.message
          : t("The profile was not saved."),
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <CardSurface
      sx={{ padding: { xs: "1.5rem 1.25rem", sm: "1.75rem 1.9rem" } }}
    >
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Section label={t("Name")}>
          <FieldRow label={t("First name")} htmlFor="profile-first-name">
            <CardField
              id="profile-first-name"
              value={form.FirstName}
              onChange={(value) => set("FirstName", value)}
              error={errors.FirstName}
              loading={loading}
            />
          </FieldRow>
          <FieldRow label={t("Last name")} htmlFor="profile-last-name">
            <CardField
              id="profile-last-name"
              value={form.LastName}
              onChange={(value) => set("LastName", value)}
              error={errors.LastName}
              loading={loading}
            />
          </FieldRow>
          <FieldRow label={t("Nickname")} htmlFor="profile-nickname">
            <CardField
              id="profile-nickname"
              value={form.NickName}
              onChange={(value) => set("NickName", value)}
              error={errors.NickName}
              loading={loading}
            />
          </FieldRow>
          <FieldRow label={t("Designation")} htmlFor="profile-designation">
            <CardField
              id="profile-designation"
              value={form.Designation}
              onChange={(value) => set("Designation", value)}
              error={errors.Designation}
              loading={loading}
            />
          </FieldRow>
        </Section>

        <Section label={t("Contact info")}>
          <FieldRow label={t("Email")} htmlFor="profile-email">
            <CardField
              id="profile-email"
              value={identity?.email ?? ""}
              onChange={() => undefined}
              readOnly
              hint={t("Your login address. Change it where you login.")}
            />
          </FieldRow>
          <FieldRow label={t("Phone")} htmlFor="profile-phone">
            <CardField
              id="profile-phone"
              type="tel"
              value={form.Phone}
              onChange={(value) => set("Phone", value)}
              error={errors.Phone}
              loading={loading}
            />
          </FieldRow>
          <FieldRow label={t("Address")} htmlFor="profile-address">
            <CardField
              id="profile-address"
              rows={2}
              value={form.Address}
              onChange={(value) => set("Address", value)}
              error={errors.Address}
              loading={loading}
            />
          </FieldRow>
        </Section>

        <Section label={t("Personal information")}>
          <FieldRow label={t("Gender")} htmlFor="profile-gender">
            <CardField
              id="profile-gender"
              value={form.Gender}
              /* The select offers exactly these four, so the cast is saying
               * what the control already guarantees -- and the schema checks
               * it again on the way out regardless. */
              onChange={(value) => set("Gender", value as Profile["Gender"])}
              /* The value is what the column holds and the schema checks;
               * only what is read off the screen is translated. */
              options={genders.map((gender) => ({
                value: gender,
                label: t(gender),
              }))}
              error={errors.Gender}
              loading={loading}
            />
          </FieldRow>
          <FieldRow label={t("Date of birth")} htmlFor="profile-birth-date">
            <CardField
              id="profile-birth-date"
              value={shownDate(form.BirthDate)}
              onChange={(value) => set("BirthDate", storedDate(value))}
              placeholder={BIRTH_DATE_MASK}
              /* The schema's message names the format the API stores, and
               * this field is not showing the format the API stores. */
              error={errors.BirthDate?.replace("YYYY-MM-DD", BIRTH_DATE_MASK)}
              hint={t("Leave it empty if you would rather not say.")}
              loading={loading}
            />
          </FieldRow>
        </Section>

        {/* Alphabetical, the same order the card beside this lists them in
         * and the schema declares them in: there is no ranking to express
         * between these, so a new one has exactly one place to go. */}
        <Section label={t("Social info")}>
          <FieldRow label="Facebook" htmlFor="profile-facebook">
            <CardField
              id="profile-facebook"
              value={form.Facebook}
              onChange={(value) => set("Facebook", value)}
              error={errors.Facebook}
              loading={loading}
            />
          </FieldRow>
          <FieldRow label="GitHub" htmlFor="profile-github">
            <CardField
              id="profile-github"
              value={form.Github}
              onChange={(value) => set("Github", value)}
              error={errors.Github}
              loading={loading}
            />
          </FieldRow>
          <FieldRow label="LinkedIn" htmlFor="profile-linkedin">
            <CardField
              id="profile-linkedin"
              value={form.LinkedIn}
              onChange={(value) => set("LinkedIn", value)}
              error={errors.LinkedIn}
              loading={loading}
            />
          </FieldRow>
          <FieldRow label="TikTok" htmlFor="profile-tiktok">
            <CardField
              id="profile-tiktok"
              value={form.TikTok}
              onChange={(value) => set("TikTok", value)}
              error={errors.TikTok}
              loading={loading}
            />
          </FieldRow>
          <FieldRow label="Twitter" htmlFor="profile-twitter">
            <CardField
              id="profile-twitter"
              value={form.Twitter}
              onChange={(value) => set("Twitter", value)}
              error={errors.Twitter}
              loading={loading}
            />
          </FieldRow>
        </Section>

        <Section label={t("About yourself")}>
          <FieldRow label={t("Biographical info")} htmlFor="profile-biography">
            <CardField
              id="profile-biography"
              rows={4}
              value={form.Biography}
              onChange={(value) => set("Biography", value)}
              error={errors.Biography}
              loading={loading}
            />
          </FieldRow>
        </Section>

        <Section label={t("Email preferences")} last>
          <FieldRow label={t("Send me")}>
            {loading ? (
              <Skeleton sx={{ maxWidth: 280 }} />
            ) : (
              <Stack sx={{ gap: 0.5 }}>
                <Preference
                  checked={form.WantsAwardEmails}
                  onChange={(next) => set("WantsAwardEmails", next)}
                  label={t("Email when a badge or a level is awarded to me")}
                />
                <Preference
                  checked={form.WantsDigestEmails}
                  onChange={(next) => set("WantsDigestEmails", next)}
                  label={t("A weekly digest of the program's scoreboard")}
                />
              </Stack>
            )}
          </FieldRow>
        </Section>

        <Divider
          sx={{ my: 3, borderColor: (theme) => theme.palette.brand.cardRule }}
        />

        <Button
          type="submit"
          variant="contained"
          disabled={loading || saving}
          startIcon={
            saving ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          {saving ? t("Saving…") : t("Update profile")}
        </Button>
      </Box>
    </CardSurface>
  );
}

function Section({
  label,
  children,
  last = false,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <Box sx={{ marginBottom: last ? 0 : 3.5 }}>
      <Box sx={{ marginBottom: 2 }}>
        <CardLabel>{label}</CardLabel>
      </Box>
      {children}
    </Box>
  );
}

function Preference({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          sx={{
            color: (theme) => theme.palette.brand.cardInkMuted,
            "&.Mui-checked": { color: "primary.main" },
          }}
        />
      }
      label={<Typography sx={{ fontSize: "0.88rem" }}>{label}</Typography>}
      sx={{ alignItems: "center", marginLeft: "-0.6rem" }}
    />
  );
}
