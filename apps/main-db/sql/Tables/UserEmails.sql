--
-- Every address an account has on file. One row per address, one of them
-- marked primary, and the primary is the one its owner signs in with.
--
-- This table is new and dbo.Users."Email" is older than it. The column stays,
-- because it is what Keycloak's token says and what dbo.ProvisionUser refreshes
-- on every sign-in; this table is the application's own list, and the primary
-- row and that column are kept saying the same thing by dbo.ProvisionUser on
-- the way in and by dbo.SetPrimaryUserEmail on the way out. A reader that
-- wants "the address this person signs in with" may use either. A reader that
-- wants "every address that reaches this person" has to come here.
--
-- "Email" is stored already folded to lower case and trimmed, which is what
-- the check constraint enforces rather than merely hopes for. That is what
-- makes the unique key mean what it looks like it means: Postgres compares
-- varchar by bytes, so "Ada@example.test" and "ada@example.test" would be two
-- rows under a plain UNIQUE, and an address that belongs to two accounts is
-- the one thing this table must not allow. dbo.InviteToOrganization already
-- folded addresses this way for the same reason.
--
-- The unique key is over "Email" alone rather than over (user, address): an
-- address identifies a person to everything that sends mail to it, so two
-- accounts claiming the same one is a collision rather than a coincidence.
-- Keycloak is configured the same way ("duplicateEmailsAllowed": false).
--
-- "VerifiedAt" is the whole of the verified status: NULL means nobody has
-- proved they read mail at this address, and a timestamp means somebody did
-- and when. A boolean beside it would be a second copy of the same fact, and
-- the two would eventually disagree.
--
-- "VerificationToken" is the secret from the link in the verification mail. It
-- is cleared the moment it is spent, so a link works once, and it is unique
-- across the table because dbo.VerifyUserEmail is given nothing but the token
-- and has to find the row from it. NULLs are distinct in Postgres, so every
-- verified row holding NULL costs the key nothing.
--
-- There is no "IsPrimary" uniqueness constraint. Exactly one row per account
-- carries it, and dbo.SetPrimaryUserEmail is what makes that true, in the same
-- arrangement dbo.SetDefaultPaymentMethod uses for the wallet: clear the flag,
-- then set one, inside the caller's transaction. Writing "IsPrimary" by hand
-- goes round it and leaves an account with two primaries or none.
--
CREATE TABLE "dbo"."UserEmails" (
    "UserEmailUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "UserUUID" uuid NOT NULL,
    "Email" varchar(255) NOT NULL,
    "IsPrimary" boolean NOT NULL DEFAULT false,
    -- NULL until somebody follows the link. See above: this is the status.
    "VerifiedAt" TIMESTAMPTZ,
    -- The secret in the link, NULL once spent or once verified another way.
    "VerificationToken" varchar(64),
    -- When the last verification mail went out, so a resend can be rate
    -- limited and so a stale unverified row can be told from a fresh one.
    "VerificationSentAt" TIMESTAMPTZ,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "UserEmails_Email_UniqueKey" UNIQUE ("Email"),
    CONSTRAINT "UserEmails_VerificationToken_UniqueKey" UNIQUE ("VerificationToken"),
    -- Folded and trimmed on the way in, and an address at all. The second half
    -- is the same shape test dbo.InviteToOrganization applies: an "@" that is
    -- not the first character. Anything stricter belongs in main-api, which
    -- can say why it refused in a sentence somebody reads.
    CONSTRAINT "UserEmails_Email_Check" CHECK (
        "Email" = lower(btrim("Email"))
        AND position('@' IN "Email") > 1
    )
);
