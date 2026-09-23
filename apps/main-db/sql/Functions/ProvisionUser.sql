--
-- Return the account behind a verified Keycloak identity, creating it on the
-- first sign-in. This replaced dbo.LoginUser, which took a bare login name and
-- trusted it: there is no credential check here either, and there must not be
-- one -- the caller has already verified the token's signature against the
-- realm's public keys, and this function only maps that verified identity onto
-- a row.
--
-- The subject is the identity. Keycloak guarantees it never changes, while the
-- username and the email are both things a user can edit, so those are copies
-- refreshed on every sign-in rather than keys.
--
-- An account with no subject is claimed by login name the first time its owner
-- signs in, which is how seeded and imported rows survive the move to
-- Keycloak. That is only safe while Keycloak is the sole source of login
-- names; a second identity provider issuing the same username would land on
-- the same row. See SCHEMA-NOTES.md.
--
-- Since dbo.UserEmails exists, this also keeps the primary row in that table
-- pointing at the address the token carries. The two are the same fact seen
-- from two sides: dbo.Users."Email" is what Keycloak says today, and the
-- primary row is the security page's copy of it, so a sign-in that changes one
-- has to change the other or the page would show an address its owner no
-- longer signs in with.
--
-- _TokenIssuedAt is the token's "iat", and it is what stops a change made on
-- the security page from undoing itself. A token is minted once and used until
-- it expires, so a token issued before dbo.SetPrimaryUserEmail ran still
-- carries the old address; without this, the next request after the change
-- would hand that old address back here and this function -- doing exactly
-- what it is told, Keycloak wins -- would move the primary back. The person
-- would watch their new sign-in address revert a moment after setting it.
--
-- So a token cannot tell us about a change it predates: when the primary row
-- has been written since the token was issued, the address on the token is
-- ignored and everything else about the account is still refreshed. A token
-- issued *after* the change carries the new address anyway and agrees.
--
-- NULL means "do not know when", and is treated as current, which is the old
-- behavior for any caller that does not pass one.
--
-- _EmailVerified is the token's "email_verified" claim, passed through rather
-- than assumed. Keycloak can hold an address nobody has confirmed, and this
-- function is the only thing that can honestly mark a row verified without a
-- link having been followed: it is saying "the identity provider vouches for
-- this one", which is a different claim from "we mailed it and somebody
-- answered" but is the one that matters for a login. A false claim leaves the
-- row unverified and the security page offers to send a link.
--
CREATE FUNCTION "dbo"."ProvisionUser" (_SubjectId varchar(255), _LoginName varchar(64), _Name varchar(64), _Email varchar(255), _EmailVerified boolean DEFAULT false, _TokenIssuedAt TIMESTAMPTZ DEFAULT NULL) RETURNS TABLE(
    "UserUUID" uuid,
    "Name" varchar(64),
    "LoginName" varchar(64),
    "Email" varchar(255),
    "IsAdmin" boolean,
    "IsEnabled" boolean
) AS $$
    DECLARE
        _MatchedUserUUID uuid;
        _NormalizedEmail varchar(255) = lower(btrim(COALESCE(_Email, '')));
        _ExistingEmailUUID uuid;
        _ExistingEmailOwner uuid;
        -- True when this token was minted before the primary address last
        -- changed here, so it cannot be describing the current one. See above.
        _TokenPredatesTheAddress boolean = false;
    BEGIN
        IF _SubjectId IS NULL OR btrim(_SubjectId) = '' THEN
            RAISE EXCEPTION 'A subject is required.';
        END IF;
        IF _LoginName IS NULL OR btrim(_LoginName) = '' THEN
            RAISE EXCEPTION 'A login name is required.';
        END IF;

        SELECT "Users"."UserUUID" INTO _MatchedUserUUID
        FROM "dbo"."Users"
        WHERE "Users"."SubjectId" = _SubjectId;

        IF _MatchedUserUUID IS NULL THEN
            UPDATE "dbo"."Users" SET
                "SubjectId" = _SubjectId,
                "UpdatedBy" = _LoginName
            WHERE "Users"."LoginName" = _LoginName
                AND "Users"."SubjectId" IS NULL
            RETURNING "Users"."UserUUID" INTO _MatchedUserUUID;
        END IF;

        -- Asked before anything is written, and only for an account that
        -- already exists: a brand new one has no address to be stale about.
        IF _MatchedUserUUID IS NOT NULL AND _TokenIssuedAt IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 FROM "dbo"."UserEmails"
                WHERE "UserEmails"."UserUUID" = _MatchedUserUUID
                    AND "UserEmails"."IsPrimary"
                    AND COALESCE("UserEmails"."UpdatedAt", "UserEmails"."CreatedAt") > _TokenIssuedAt
            ) INTO _TokenPredatesTheAddress;
        END IF;

        IF _MatchedUserUUID IS NULL THEN
            INSERT INTO "dbo"."Users" ("SubjectId", "Name", "LoginName", "Email", "CreatedBy")
            VALUES (
                _SubjectId,
                COALESCE(NULLIF(btrim(_Name), ''), _LoginName),
                _LoginName,
                COALESCE(_Email, ''),
                _LoginName
            )
            RETURNING "Users"."UserUUID" INTO _MatchedUserUUID;
        ELSE
            -- The username and the email belong to Keycloak; this is a copy,
            -- so a change there wins here. The exception is an address this
            -- token predates, which is not a change there at all -- it is this
            -- token being older than the last one made here.
            UPDATE "dbo"."Users" SET
                "LoginName" = _LoginName,
                "Name" = COALESCE(NULLIF(btrim(_Name), ''), "Users"."Name"),
                "Email" = CASE
                    WHEN _TokenPredatesTheAddress THEN "Users"."Email"
                    ELSE COALESCE(_Email, "Users"."Email")
                END,
                "UpdatedBy" = _LoginName
            WHERE "Users"."UserUUID" = _MatchedUserUUID;
        END IF;

        -- The address list, kept in step with the token. Everything below is
        -- skipped for a token carrying no address: an account can exist
        -- without one, dbo.Users."Email" defaults to '', and a row in
        -- dbo.UserEmails holding nothing would fail its own check constraint.
        IF NOT _TokenPredatesTheAddress
            AND _NormalizedEmail <> ''
            AND position('@' IN _NormalizedEmail) > 1 THEN
            SELECT "UserEmails"."UserEmailUUID", "UserEmails"."UserUUID"
            INTO _ExistingEmailUUID, _ExistingEmailOwner
            FROM "dbo"."UserEmails"
            WHERE "UserEmails"."Email" = _NormalizedEmail;

            IF _ExistingEmailUUID IS NULL THEN
                -- Not on file anywhere, so it is this account's and it is the
                -- one they just signed in with.
                INSERT INTO "dbo"."UserEmails" (
                    "UserUUID", "Email", "IsPrimary", "VerifiedAt", "CreatedBy"
                )
                VALUES (
                    _MatchedUserUUID,
                    _NormalizedEmail,
                    true,
                    CASE WHEN COALESCE(_EmailVerified, false) THEN CURRENT_TIMESTAMP ELSE NULL END,
                    _LoginName
                )
                RETURNING "UserEmails"."UserEmailUUID" INTO _ExistingEmailUUID;
            ELSIF _ExistingEmailOwner = _MatchedUserUUID THEN
                -- Already theirs: promote it and let the identity provider's
                -- claim verify it, but never un-verify a row that a link was
                -- actually followed for.
                UPDATE "dbo"."UserEmails" SET
                    "VerifiedAt" = CASE
                        WHEN "UserEmails"."VerifiedAt" IS NOT NULL THEN "UserEmails"."VerifiedAt"
                        WHEN COALESCE(_EmailVerified, false) THEN CURRENT_TIMESTAMP
                        ELSE NULL
                    END,
                    "VerificationToken" = CASE
                        WHEN "UserEmails"."VerifiedAt" IS NULL AND COALESCE(_EmailVerified, false)
                            THEN NULL
                        ELSE "UserEmails"."VerificationToken"
                    END,
                    "UpdatedBy" = _LoginName
                WHERE "UserEmails"."UserEmailUUID" = _ExistingEmailUUID;
            ELSE
                -- Somebody else's row holds this address. Keycloak says it
                -- belongs to the account signing in, and this function will
                -- not settle that: taking the row would move an address
                -- between accounts on a sign-in, which is the one thing the
                -- unique key exists to prevent. dbo.Users."Email" above still
                -- carries the token's address, so nothing the application
                -- reads is wrong; the security page shows this account's own
                -- rows and this address is not among them.
                _ExistingEmailUUID := NULL;
            END IF;

            -- Exactly one primary, the way dbo.SetPrimaryUserEmail keeps it:
            -- clear, then set. Only the rows that carry it are touched, so
            -- "UpdatedAt" does not move on addresses nobody changed.
            IF _ExistingEmailUUID IS NOT NULL THEN
                UPDATE "dbo"."UserEmails" SET "IsPrimary" = false, "UpdatedBy" = _LoginName
                WHERE "UserEmails"."UserUUID" = _MatchedUserUUID
                    AND "UserEmails"."IsPrimary"
                    AND "UserEmails"."UserEmailUUID" <> _ExistingEmailUUID;

                UPDATE "dbo"."UserEmails" SET "IsPrimary" = true, "UpdatedBy" = _LoginName
                WHERE "UserEmails"."UserEmailUUID" = _ExistingEmailUUID
                    AND NOT "UserEmails"."IsPrimary";
            END IF;
        END IF;

        RETURN QUERY
        SELECT
            "Users"."UserUUID",
            "Users"."Name",
            "Users"."LoginName",
            "Users"."Email",
            "Users"."IsAdmin",
            "Users"."IsEnabled"
        FROM
            "dbo"."Users"
        WHERE
            "Users"."UserUUID" = _MatchedUserUUID;
    END;
$$ LANGUAGE plpgsql;
