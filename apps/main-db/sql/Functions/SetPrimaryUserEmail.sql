--
-- Choose which address an account signs in with.
--
-- This is the one function here that changes a login, and it is half of the
-- change rather than all of it. Keycloak holds the credential and issues the
-- token; this database holds a copy. main-api calls this and updates Keycloak
-- in the same operation, and it has to do both: dbo.ProvisionUser refreshes
-- dbo.Users."Email" from the token on every sign-in, so a primary set here and
-- not set there survives exactly until its owner signs in again. See
-- main-api's emails service, which is the only caller.
--
-- The address has to be verified first. An unverified address is one nobody
-- has proved they can read, and making it a login would hand the account to
-- whoever does read it. So this refuses, and the page's own rule is the same.
--
-- Exactly one row per account carries "IsPrimary", and this function is what
-- makes that true: clear it, then set one, in one statement each, inside the
-- caller's transaction. That is dbo.SetDefaultPaymentMethod's arrangement, for
-- the same reason it is not a constraint there.
--
-- dbo.Users."Email" is written with it, so the column and the primary row say
-- the same thing between sign-ins. Everything that reads an account's address
-- the old way -- the members list, the invitation match -- keeps working
-- without knowing this table exists.
--
CREATE FUNCTION "dbo"."SetPrimaryUserEmail" (
    _LoginName varchar(64),
    _UserEmailUUID uuid
) RETURNS TABLE(
    "UserEmailUUID" uuid,
    "Email" varchar(255),
    "IsPrimary" boolean,
    "IsVerified" boolean,
    "VerifiedAt" TIMESTAMPTZ,
    "CreatedAt" TIMESTAMPTZ
) AS $$
    DECLARE
        _UserUUID uuid;
        _Chosen record;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        SELECT "UserEmails"."Email", "UserEmails"."VerifiedAt"
        INTO _Chosen
        FROM "dbo"."UserEmails"
        WHERE "UserEmails"."UserEmailUUID" = _UserEmailUUID
            AND "UserEmails"."UserUUID" = _UserUUID;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;
        IF _Chosen."VerifiedAt" IS NULL THEN
            RAISE EXCEPTION 'An address has to be verified before you can sign in with it.';
        END IF;

        -- Only the row that actually carries it: an UPDATE touching every
        -- address would move "UpdatedAt" on rows nobody changed.
        UPDATE "dbo"."UserEmails" SET "IsPrimary" = false, "UpdatedBy" = _LoginName
        WHERE "UserEmails"."UserUUID" = _UserUUID AND "UserEmails"."IsPrimary";

        UPDATE "dbo"."UserEmails" SET "IsPrimary" = true, "UpdatedBy" = _LoginName
        WHERE "UserEmails"."UserEmailUUID" = _UserEmailUUID;

        UPDATE "dbo"."Users" SET "Email" = _Chosen."Email", "UpdatedBy" = _LoginName
        WHERE "Users"."UserUUID" = _UserUUID;

        RETURN QUERY SELECT * FROM "dbo"."GetUserEmails"(_LoginName);
    END;
$$ LANGUAGE plpgsql;
