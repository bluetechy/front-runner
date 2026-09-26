--
-- The codes somebody keeps for the day their second factor is gone: one row
-- per code, and whether it has been used.
--
-- Two-factor authentication itself is not in this database and never will be.
-- Keycloak holds the authenticator app's secret and refuses the token when the
-- code is wrong, the same way it holds passwords. What it has no answer for is
-- the person whose phone is in a lake: its token endpoint will accept nothing
-- but a valid code, so there is no way through it at all. These codes are the
-- way back, and they are ours because they are the one credential in the
-- account that Keycloak cannot be asked to hold. See apps/main-api/src/two-factor.
--
-- "SubjectId" is the Keycloak `sub` claim, the same value dbo.Users."SubjectId"
-- carries, and as in dbo.PasswordResets there is deliberately no foreign key to
-- dbo.Users: a row here is about an account at the identity provider, and
-- dbo.ProvisionUser writes our own row from the token on the first request of
-- a first session. Somebody who registered, turned on two-factor and never got
-- back in is exactly the person who needs this, and pointing at dbo.Users would
-- refuse them.
--
-- "CodeHash" is SHA-256 of the code, hex, computed in main-api. The code itself
-- is ten characters of randomness from main-api, so the hash is not there to
-- slow an attacker down the way a password hash is -- there is no dictionary to
-- walk -- it is there so that a copy of this table is not a working set of keys
-- to every account that has ever generated one. A slow hash would buy nothing
-- against a secret with this much entropy in it and would cost a second of CPU
-- on every login attempt that spends one.
--
-- "BatchId" is which set of ten a code came from. It is what "you have four
-- codes left, made on the 3rd" is read off, and it is why generating a new set
-- can retire the old one wholesale without deleting anything.
--
-- "SpentAt" is the whole of the used status: NULL means the code still works, a
-- timestamp means it stopped working and when. It is set two ways and both mean
-- the code is finished: somebody used it, or a newer batch replaced it. A set of
-- codes printed and left in a drawer is a standing key to an account, so asking
-- for new ones has to stop the old ones working.
--
-- Rows are kept after they are spent rather than deleted, as in
-- dbo.PasswordResets: what they hold is that somebody was locked out of an
-- account and got back in, and when, which is worth having when the question is
-- later "who has been getting into this account".
--
CREATE TABLE "dbo"."RecoveryCodes" (
    "RecoveryCodeUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    -- The Keycloak "sub" of the account these codes belong to. No foreign key:
    -- see above.
    "SubjectId" varchar(255) NOT NULL,
    -- SHA-256 of the code, hex, from main-api. Never the code itself.
    "CodeHash" varchar(64) NOT NULL,
    -- Which set of ten this came from, so a batch can be counted and retired
    -- as one thing.
    "BatchId" uuid NOT NULL,
    -- NULL while the code still works. See above: this is the status.
    "SpentAt" TIMESTAMPTZ,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    -- One code is spendable by exactly one account. Unique on the pair rather
    -- than on the hash alone: two accounts drawing the same ten characters is
    -- vanishingly unlikely and is not a reason to refuse the second one's whole
    -- batch, but the same account holding one code twice would let a single
    -- code be spent twice.
    CONSTRAINT "RecoveryCodes_SubjectId_CodeHash_UniqueKey" UNIQUE ("SubjectId", "CodeHash"),
    -- A hash that is blank matches whatever a caller forgot to fill in.
    -- dbo.ReplaceRecoveryCodes refuses one; this makes it impossible to store
    -- one by another route.
    CONSTRAINT "RecoveryCodes_CodeHash_Check" CHECK (btrim("CodeHash") <> '')
);
