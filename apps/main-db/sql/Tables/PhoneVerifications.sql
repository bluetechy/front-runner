--
-- A phone number somebody is in the middle of proving is theirs: the code that
-- went to it, and whether that code has been used up.
--
-- This is enrollment and only enrollment. Once the code has been typed back,
-- the number is written to the account at Keycloak as an attribute and this
-- row is finished; the codes sent at login are made, held and checked inside
-- Keycloak by the SMS authenticator in apps/keycloak-idp/plugin, because
-- deciding whether a login proceeds is the identity provider's job and not
-- this application's. What is left here is the one question Keycloak has no
-- opinion about: whether the number on file was ever answered by the person
-- who typed it. See apps/main-api/src/two-factor.
--
-- "SubjectId" is the Keycloak `sub` claim, the same value dbo.Users."SubjectId"
-- carries, and as in dbo.PasswordResets and dbo.RecoveryCodes there is
-- deliberately no foreign key to dbo.Users: a row here is about an account at
-- the identity provider.
--
-- "PhoneNumber" is the candidate, in E.164, and it is here rather than in
-- Keycloak for the length of the verification precisely because it is not
-- proved yet. An unproved number written to the account would be a second
-- factor somebody could point at a phone they do not own, which is the whole
-- attack this table exists to close.
--
-- "CodeHash" is SHA-256 of the six digits, hex, computed in main-api. Six
-- digits is a fifth of a million guesses, which is nothing, so unlike a
-- recovery code the entropy is not what protects this: "Attempts" and the ten
-- minutes are. The hash is here so that a copy of the table is not a list of
-- live codes.
--
-- "Attempts" is how many wrong codes have been typed against this row. The
-- function retires the row at five, which turns a number that could be walked
-- in an afternoon into one somebody gets five shots at before the message has
-- to be sent again.
--
-- "SpentAt" is the whole of the status, as it is in the two tables above:
-- NULL means the code still works, and a timestamp means it stopped working
-- and when. It is set three ways and all of them mean finished -- the code was
-- used, a newer request replaced it, or five wrong guesses retired it.
--
-- Rows are kept after they are spent rather than deleted: what they hold is
-- that somebody attached a phone number to an account and when, which is worth
-- having when the question is later "who has been getting into this account".
--
CREATE TABLE "dbo"."PhoneVerifications" (
    "PhoneVerificationUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    -- The Keycloak "sub" of the account attaching the number. No foreign key:
    -- see above.
    "SubjectId" varchar(255) NOT NULL,
    -- The candidate number in E.164, held only until it is proved.
    "PhoneNumber" varchar(20) NOT NULL,
    -- SHA-256 of the six digits, hex, from main-api. Never the code itself.
    "CodeHash" varchar(64) NOT NULL,
    -- When the message went out, which is what the ten minutes is counted from.
    "SentAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- How many wrong codes have been typed against this row. See above: this
    -- is what stands in for the entropy six digits do not have.
    "Attempts" integer NOT NULL DEFAULT 0,
    -- NULL while the code still works. See above: this is the status.
    "SpentAt" TIMESTAMPTZ,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    -- A blank code matches whatever a caller forgot to fill in, and a blank
    -- number is a message addressed nowhere. Both functions refuse them; these
    -- make it impossible to store one by another route.
    CONSTRAINT "PhoneVerifications_CodeHash_Check" CHECK (btrim("CodeHash") <> ''),
    CONSTRAINT "PhoneVerifications_PhoneNumber_Check" CHECK (btrim("PhoneNumber") <> ''),
    CONSTRAINT "PhoneVerifications_Attempts_Check" CHECK ("Attempts" >= 0)
);
