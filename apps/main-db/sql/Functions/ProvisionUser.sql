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
CREATE FUNCTION "dbo"."ProvisionUser" (_SubjectId varchar(255), _LoginName varchar(64), _Name varchar(64), _Email varchar(255)) RETURNS TABLE(
    "UserUUID" uuid,
    "Name" varchar(64),
    "LoginName" varchar(64),
    "Email" varchar(255),
    "IsAdmin" boolean,
    "IsEnabled" boolean
) AS $$
    DECLARE
        _MatchedUserUUID uuid;
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
            -- so a change there wins here.
            UPDATE "dbo"."Users" SET
                "LoginName" = _LoginName,
                "Name" = COALESCE(NULLIF(btrim(_Name), ''), "Users"."Name"),
                "Email" = COALESCE(_Email, "Users"."Email"),
                "UpdatedBy" = _LoginName
            WHERE "Users"."UserUUID" = _MatchedUserUUID;
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
