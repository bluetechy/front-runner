import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CardLabel, CardSurface } from "../card-surface";
import { useSession, type Identity } from "../authentication";
import { CardField, FieldRow } from "./card-field";
import { languages, placeholderBio, placeholderPosition } from "./details";

/*
 * The right-hand column: the profile as a form.
 *
 * Three of the fields are real -- the user name, the email address and the
 * two halves of the name come off the token -- and the rest are placeholder,
 * because there is nothing behind them. Nothing here saves: main-api has no
 * profile mutation, so the button says so rather than pretending, and the
 * edits stay on the page until it is reloaded.
 */

interface Form {
  language: string;
  userName: string;
  firstName: string;
  lastName: string;
  nickName: string;
  designation: string;
  email: string;
  website: string;
  phone: string;
  address: string;
  twitter: string;
  facebook: string;
  linkedIn: string;
  github: string;
  biography: string;
  wantsUpdates: boolean;
  wantsDigest: boolean;
}

/* The token carries one name. Everything before the last space is the first
 * name, which is wrong for some people and is why this is what a form is
 * for: it is the starting point, not the record. */
function seed(identity: Identity | null): Form {
  const whole = (identity?.name ?? "").trim();
  const cut = whole.lastIndexOf(" ");

  return {
    language: languages[0],
    userName: identity?.loginName ?? "",
    firstName: cut === -1 ? whole : whole.slice(0, cut),
    lastName: cut === -1 ? "" : whole.slice(cut + 1),
    nickName: "",
    designation: placeholderPosition,
    email: identity?.email ?? "",
    website: "testuser.example",
    phone: "+1 555 0134",
    address: "San Francisco, CA",
    twitter: "twitter.com/testuser",
    facebook: "facebook.com/testuser",
    linkedIn: "linkedin.com/in/testuser",
    github: "github.com/testuser",
    biography: placeholderBio,
    wantsUpdates: true,
    wantsDigest: false,
  };
}

export function ProfileForm({
  onNotice,
}: {
  onNotice: (message: string) => void;
}) {
  const { identity } = useSession();
  const [form, setForm] = useState<Form>(() => seed(identity));

  /* A remembered session is restored a moment after this mounts, so the
   * fields are seeded again the first time an identity arrives -- once, so
   * that it cannot overwrite something already typed. */
  const seeded = useRef(identity !== null);
  useEffect(() => {
    if (seeded.current || !identity) return;
    seeded.current = true;
    setForm(seed(identity));
  }, [identity]);

  function set<Field extends keyof Form>(field: Field, value: Form[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <CardSurface
      sx={{
        padding: { xs: "1.5rem 1.25rem", sm: "1.75rem 1.9rem" },
      }}
    >
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          onNotice(
            "Nothing is saved yet — main-api has no profile to write to. These edits stay on this page.",
          );
        }}
      >
        <Section label="Personal information">
          <FieldRow label="Language" htmlFor="profile-language">
            <CardField
              id="profile-language"
              value={form.language}
              onChange={(value) => set("language", value)}
              options={languages}
            />
          </FieldRow>
        </Section>

        <Section label="Name">
          <FieldRow label="User name" htmlFor="profile-user-name">
            <CardField
              id="profile-user-name"
              value={form.userName}
              onChange={(value) => set("userName", value)}
            />
          </FieldRow>
          <FieldRow label="First name" htmlFor="profile-first-name">
            <CardField
              id="profile-first-name"
              value={form.firstName}
              onChange={(value) => set("firstName", value)}
            />
          </FieldRow>
          <FieldRow label="Last name" htmlFor="profile-last-name">
            <CardField
              id="profile-last-name"
              value={form.lastName}
              onChange={(value) => set("lastName", value)}
            />
          </FieldRow>
          <FieldRow label="Nickname" htmlFor="profile-nickname">
            <CardField
              id="profile-nickname"
              value={form.nickName}
              onChange={(value) => set("nickName", value)}
            />
          </FieldRow>
          <FieldRow label="Designation" htmlFor="profile-designation">
            <CardField
              id="profile-designation"
              value={form.designation}
              onChange={(value) => set("designation", value)}
            />
          </FieldRow>
        </Section>

        <Section label="Contact info">
          <FieldRow
            label={
              <>
                Email{" "}
                <Box
                  component="span"
                  sx={{
                    fontStyle: "italic",
                    color: (theme) => theme.palette.brand.cardInkMuted,
                  }}
                >
                  (required)
                </Box>
              </>
            }
            htmlFor="profile-email"
          >
            <CardField
              id="profile-email"
              type="email"
              required
              value={form.email}
              onChange={(value) => set("email", value)}
            />
          </FieldRow>
          <FieldRow label="Website" htmlFor="profile-website">
            <CardField
              id="profile-website"
              value={form.website}
              onChange={(value) => set("website", value)}
            />
          </FieldRow>
          <FieldRow label="Phone" htmlFor="profile-phone">
            <CardField
              id="profile-phone"
              type="tel"
              value={form.phone}
              onChange={(value) => set("phone", value)}
            />
          </FieldRow>
          <FieldRow label="Address" htmlFor="profile-address">
            <CardField
              id="profile-address"
              rows={2}
              value={form.address}
              onChange={(value) => set("address", value)}
            />
          </FieldRow>
        </Section>

        <Section label="Social info">
          <FieldRow label="Twitter" htmlFor="profile-twitter">
            <CardField
              id="profile-twitter"
              value={form.twitter}
              onChange={(value) => set("twitter", value)}
            />
          </FieldRow>
          <FieldRow label="Facebook" htmlFor="profile-facebook">
            <CardField
              id="profile-facebook"
              value={form.facebook}
              onChange={(value) => set("facebook", value)}
            />
          </FieldRow>
          <FieldRow label="LinkedIn" htmlFor="profile-linkedin">
            <CardField
              id="profile-linkedin"
              value={form.linkedIn}
              onChange={(value) => set("linkedIn", value)}
            />
          </FieldRow>
          <FieldRow label="GitHub" htmlFor="profile-github">
            <CardField
              id="profile-github"
              value={form.github}
              onChange={(value) => set("github", value)}
            />
          </FieldRow>
        </Section>

        <Section label="About yourself">
          <FieldRow label="Biographical info" htmlFor="profile-biography">
            <CardField
              id="profile-biography"
              rows={4}
              value={form.biography}
              onChange={(value) => set("biography", value)}
            />
          </FieldRow>
        </Section>

        <Section label="Email preferences" last>
          <FieldRow label="Send me">
            <Stack sx={{ gap: 0.5 }}>
              <Preference
                checked={form.wantsUpdates}
                onChange={(next) => set("wantsUpdates", next)}
                label="Email when a badge or a level is awarded to me"
              />
              <Preference
                checked={form.wantsDigest}
                onChange={(next) => set("wantsDigest", next)}
                label="A weekly digest of the programme's scoreboard"
              />
            </Stack>
          </FieldRow>
        </Section>

        <Divider
          sx={{
            my: 3,
            borderColor: (theme) => theme.palette.brand.cardRule,
          }}
        />

        <Button type="submit" variant="contained">
          Update profile
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
