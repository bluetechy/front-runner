--
-- Put another address on an account, unverified, with the secret that the
-- verification link will carry.
--
-- The token is made by the caller rather than here. main-api has a source of
-- cryptographic randomness and this database does not have one it should be
-- trusted with: gen_random_uuid is a UUID generator, not a secret generator,
-- and a token somebody can guess is a way to attach an address they do not
-- own. So the shape of the secret is main-api's decision and this function
-- only stores it. It is required, because an unverified row with no token is
-- an address that can never become verified.
--
-- The address arrives in whatever case it was typed and is folded here, which
-- is what dbo.UserEmails."Email" requires and what makes its unique key mean
-- anything. dbo.InviteToOrganization folds the same way.
--
-- An address already on any account is refused with one sentence that does
-- not say which account, because "that one is taken" and "that one is already
-- yours" are different facts and only one of them is the caller's to know.
--
-- The new row is never primary. Becoming the address somebody signs in with
-- is dbo.SetPrimaryUserEmail's business and it refuses an unverified one, so
-- there is no path here that changes a login.
--
-- Like the wallet's writes, this answers with the whole list: the caller is
-- showing a table and there is no useful thing to do with one row of it.
--
CREATE FUNCTION "dbo"."AddUserEmail" (
    _LoginName varchar(64),
    _Email varchar(255),
    _VerificationToken varchar(64)
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
        _NormalizedEmail varchar(255) = lower(btrim(COALESCE(_Email, '')));
        _Held integer;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        IF _NormalizedEmail = '' OR position('@' IN _NormalizedEmail) < 2 THEN
            RAISE EXCEPTION 'An email address is required.';
        END IF;
        IF _VerificationToken IS NULL OR btrim(_VerificationToken) = '' THEN
            RAISE EXCEPTION 'A verification token is required.';
        END IF;

        -- A ceiling rather than a limit anybody asked for: a list this page
        -- draws as a table stops being one somewhere, and an account
        -- collecting hundreds of addresses is a script rather than a person.
        SELECT count(*) INTO _Held
        FROM "dbo"."UserEmails"
        WHERE "UserEmails"."UserUUID" = _UserUUID;

        IF _Held >= 10 THEN
            RAISE EXCEPTION 'An account can hold ten email addresses.';
        END IF;

        -- Checked here as well as by the unique key, so the caller is told in
        -- a sentence rather than handed a driver's constraint violation.
        IF EXISTS (
            SELECT 1 FROM "dbo"."UserEmails"
            WHERE "UserEmails"."Email" = _NormalizedEmail
        ) THEN
            RAISE EXCEPTION 'That address is already on an account.';
        END IF;

        INSERT INTO "dbo"."UserEmails" (
            "UserUUID", "Email", "IsPrimary", "VerifiedAt",
            "VerificationToken", "VerificationSentAt", "CreatedBy"
        )
        VALUES (
            _UserUUID, _NormalizedEmail, false, NULL,
            btrim(_VerificationToken), CURRENT_TIMESTAMP, _LoginName
        );

        RETURN QUERY SELECT * FROM "dbo"."GetUserEmails"(_LoginName);
    END;
$$ LANGUAGE plpgsql;
