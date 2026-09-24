--
-- A password reset that was asked for: the secret in the link, and whether it
-- has been used.
--
-- The password itself is not here and never will be. Keycloak holds
-- credentials, and this table holds only the one thing Keycloak has no way to
-- give us: a token we minted, that our own mail carried, that our own page
-- spends. Keycloak's admin API can set a password but it cannot hand out a
-- reset link to put in a message we wrote, so the link is ours and this is
-- where it lives. See apps/main-api/src/password-reset.
--
-- "SubjectId" is the Keycloak `sub` claim, the same value dbo.Users."SubjectId"
-- carries, and there is deliberately no foreign key to dbo.Users. A row here
-- is about an account in the identity provider, and an account can exist there
-- with no row here yet: dbo.ProvisionUser writes ours from the token on the
-- first request of a first session, so somebody who registered and never
-- managed to login is exactly the person most likely to need this. Pointing at
-- dbo.Users would refuse them.
--
-- "Token" is the secret from the link. It is unique across the table because
-- dbo.SpendPasswordReset is given nothing but the token and has to find the
-- row from it, the same arrangement dbo.UserEmails."VerificationToken" uses,
-- and for the same reason it is made in main-api rather than here: this
-- database has no source of randomness it should be trusted with for a secret.
--
-- "SpentAt" is the whole of the used status: NULL means the link still works,
-- and a timestamp means it stopped working and when. It is set two ways, and
-- both of them mean "this link is finished": the link was followed and a
-- password was set, or a newer request replaced it. A second link retires the
-- first because a reset mail that has been forwarded, quoted in a reply or
-- left in a shared mailbox is otherwise a standing key to an account.
--
-- "SentAt" is when the message went out, and it is what an expiry is measured
-- from. One hour, in dbo.SpendPasswordReset: a password reset is acted on
-- while somebody is sitting there wanting to login, which is not the
-- twenty-four hours an address verification gets.
--
-- Rows are kept after they are spent rather than deleted. What they hold is
-- that somebody asked for a reset on an account and when, which is worth
-- having when the question is later "who has been trying to get in".
--
CREATE TABLE "dbo"."PasswordResets" (
    "PasswordResetUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    -- The Keycloak "sub" of the account this link resets. No foreign key: see
    -- above.
    "SubjectId" varchar(255) NOT NULL,
    -- The secret in the link, made by main-api.
    "Token" varchar(64) NOT NULL,
    -- When the mail went out, which is what the hour is counted from.
    "SentAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- NULL while the link still works. See above: this is the status.
    "SpentAt" TIMESTAMPTZ,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "PasswordResets_Token_UniqueKey" UNIQUE ("Token"),
    -- A token that is blank is a token that matches whatever a caller forgot
    -- to fill in. Both functions refuse one; this makes it impossible to
    -- store one by another route.
    CONSTRAINT "PasswordResets_Token_Check" CHECK (btrim("Token") <> '')
);
