import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { CardField, FieldRow } from "../card-field";
import { CardSurface } from "../card-surface";

/*
 * The name the account logs in under, at the top of the page, above the
 * addresses.
 *
 * It is drawn as a field rather than as a line of text on purpose. The value
 * is the same kind of thing as the addresses under it, it belongs in the same
 * kind of box, and a read-only field says what it is in the way the rest of
 * the app says it: the card's own gray fill, no deepening edge under the
 * pointer, nothing to press. What it will not do is take a keystroke.
 *
 * Nothing in this application can change it. Keycloak assigns it at sign-up
 * and dbo.ProvisionUser copies it out of the token on every login, so a value
 * typed here would last until the next login and no longer, and there is no
 * screen anywhere that writes it back. The paragraph says so rather than
 * leaving somebody to work it out from a field that quietly refuses them.
 *
 * The realm has `loginWithEmailAllowed`, so the copy says the name is one of
 * two ways in. The other is the primary address and only that one: Keycloak
 * holds a single address per account, which is the one `setPrimaryEmail`
 * writes to it.
 *
 * The copy shows the mention rather than describing it. "@" in front of the
 * name is the whole convention, and a sentence that only said so would be
 * spelling out what one example settles. The example is `@username` rather
 * than this account's own name: it stands for the shape of a mention, and the
 * field directly under it is already holding the real one.
 *
 * It was on the profile form until this card existed. A user name is not
 * something a person wrote about themselves; it is how the account is
 * addressed, which is this page's subject.
 */
export function UserNameCard({
  userName,
  sx,
}: {
  userName: string;
  sx?: SxProps<Theme>;
}) {
  return (
    <CardSurface
      title="User Name"
      sx={[
        /* `FieldRow` carries a margin for the rows that follow it on the
         * profile form. Nothing follows this one, so without this the card
         * would end on 16 pixels of nothing. */
        { "& > :last-child": { marginBottom: 0 } },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Typography
        sx={{
          mb: 2,
          fontSize: "0.82rem",
          lineHeight: 1.7,
          color: (theme) => theme.palette.brand.cardInkMuted,
        }}
      >
        Your user name was set when you signed up and it stays with the account
        for good. You can login with it or with the email address marked primary
        below. It is also what the other members of your organizations see
        beside your name, and what they type to flag you in a comment or a
        message: put an @ in front of it, as in @username. So it is here to be
        read rather than changed. Email addresses can come and go; this one name
        cannot.
      </Typography>

      <FieldRow label="User name" htmlFor="security-user-name">
        <CardField
          id="security-user-name"
          value={userName}
          onChange={() => undefined}
          readOnly
        />
      </FieldRow>
    </CardSurface>
  );
}
