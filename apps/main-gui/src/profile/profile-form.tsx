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
import { CardLabel, CardSurface } from "../card-surface";
import { useSession, type Identity } from "../authentication";
import { CardField, FieldRow } from "./card-field";
import { useProfile, type StoredProfile } from "./profile-api";
import {
  errorsOf,
  genders,
  languages,
  type FieldErrors,
  type Profile,
} from "./profile-schema";

/*
 * The profile as a form: what is loaded from the API, edited here, checked
 * against the same rules the API enforces, and written back.
 *
 * Two fields are shown and not editable. "User name" and "Email" belong to
 * Keycloak -- dbo.ProvisionUser copies them out of the token on every sign-in
 * -- so a value typed here would last until the next sign-in and no longer.
 * They are on the form because a profile that did not show them would look
 * like it had lost them.
 */

/* The blank the form starts from before the API answers. */
const EMPTY: Profile = {
  FirstName: "",
  LastName: "",
  NickName: "",
  Designation: "",
  Biography: "",
  Language: languages[0].tag,
  Gender: "Not specified",
  BirthDate: "",
  Phone: "",
  Address: "",
  Twitter: "",
  Facebook: "",
  LinkedIn: "",
  Github: "",
  WantsAwardEmails: true,
  WantsDigestEmails: false,
};

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
  onNotice: (message: string, tone?: "success" | "info" | "error") => void;
}) {
  const { identity } = useSession();
  const { profile, loading, save } = useProfile();
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
      onNotice("Some fields need another look — see the messages on them.");
      return;
    }

    setSaving(true);
    try {
      await save(form);
      onNotice("Profile saved.", "success");
    } catch (failure: unknown) {
      /* The API is the authority. If it refused something this form let
       * through, its message is the one worth showing. */
      onNotice(
        failure instanceof Error
          ? failure.message
          : "The profile was not saved.",
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
        <Section label="Personal information">
          <FieldRow label="Language" htmlFor="profile-language">
            <CardField
              id="profile-language"
              value={form.Language}
              onChange={(value) => set("Language", value)}
              options={languages.map((language) => ({
                value: language.tag,
                label: language.label,
              }))}
              error={errors.Language}
              loading={loading}
            />
          </FieldRow>
          <FieldRow label="Gender" htmlFor="profile-gender">
            <CardField
              id="profile-gender"
              value={form.Gender}
              /* The select offers exactly these four, so the cast is saying
               * what the control already guarantees -- and the schema checks
               * it again on the way out regardless. */
              onChange={(value) => set("Gender", value as Profile["Gender"])}
              options={genders.map((gender) => ({
                value: gender,
                label: gender,
              }))}
              error={errors.Gender}
              loading={loading}
            />
          </FieldRow>
          <FieldRow label="Date of birth" htmlFor="profile-birth-date">
            <CardField
              id="profile-birth-date"
              type="date"
              value={form.BirthDate}
              onChange={(value) => set("BirthDate", value)}
              error={errors.BirthDate}
              hint="Leave it empty if you would rather not say."
              loading={loading}
            />
          </FieldRow>
        </Section>

        <Section label="Name">
          <FieldRow label="User name" htmlFor="profile-user-name">
            <CardField
              id="profile-user-name"
              value={identity?.loginName ?? ""}
              onChange={() => undefined}
              readOnly
              hint="Your sign-in name. Change it where you sign in."
            />
          </FieldRow>
          <FieldRow label="First name" htmlFor="profile-first-name">
            <CardField
              id="profile-first-name"
              value={form.FirstName}
              onChange={(value) => set("FirstName", value)}
              error={errors.FirstName}
              loading={loading}
            />
          </FieldRow>
          <FieldRow label="Last name" htmlFor="profile-last-name">
            <CardField
              id="profile-last-name"
              value={form.LastName}
              onChange={(value) => set("LastName", value)}
              error={errors.LastName}
              loading={loading}
            />
          </FieldRow>
          <FieldRow label="Nickname" htmlFor="profile-nickname">
            <CardField
              id="profile-nickname"
              value={form.NickName}
              onChange={(value) => set("NickName", value)}
              error={errors.NickName}
              loading={loading}
            />
          </FieldRow>
          <FieldRow label="Designation" htmlFor="profile-designation">
            <CardField
              id="profile-designation"
              value={form.Designation}
              onChange={(value) => set("Designation", value)}
              error={errors.Designation}
              loading={loading}
            />
          </FieldRow>
        </Section>

        <Section label="Contact info">
          <FieldRow label="Email" htmlFor="profile-email">
            <CardField
              id="profile-email"
              value={identity?.email ?? ""}
              onChange={() => undefined}
              readOnly
              hint="Your sign-in address. Change it where you sign in."
            />
          </FieldRow>
          <FieldRow label="Phone" htmlFor="profile-phone">
            <CardField
              id="profile-phone"
              type="tel"
              value={form.Phone}
              onChange={(value) => set("Phone", value)}
              error={errors.Phone}
              loading={loading}
            />
          </FieldRow>
          <FieldRow label="Address" htmlFor="profile-address">
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

        <Section label="Social info">
          <FieldRow label="Twitter" htmlFor="profile-twitter">
            <CardField
              id="profile-twitter"
              value={form.Twitter}
              onChange={(value) => set("Twitter", value)}
              error={errors.Twitter}
              loading={loading}
            />
          </FieldRow>
          <FieldRow label="Facebook" htmlFor="profile-facebook">
            <CardField
              id="profile-facebook"
              value={form.Facebook}
              onChange={(value) => set("Facebook", value)}
              error={errors.Facebook}
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
          <FieldRow label="GitHub" htmlFor="profile-github">
            <CardField
              id="profile-github"
              value={form.Github}
              onChange={(value) => set("Github", value)}
              error={errors.Github}
              loading={loading}
            />
          </FieldRow>
        </Section>

        <Section label="About yourself">
          <FieldRow label="Biographical info" htmlFor="profile-biography">
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

        <Section label="Email preferences" last>
          <FieldRow label="Send me">
            {loading ? (
              <Skeleton sx={{ maxWidth: 280 }} />
            ) : (
              <Stack sx={{ gap: 0.5 }}>
                <Preference
                  checked={form.WantsAwardEmails}
                  onChange={(next) => set("WantsAwardEmails", next)}
                  label="Email when a badge or a level is awarded to me"
                />
                <Preference
                  checked={form.WantsDigestEmails}
                  onChange={(next) => set("WantsDigestEmails", next)}
                  label="A weekly digest of the programme's scoreboard"
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
          {saving ? "Saving…" : "Update profile"}
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
