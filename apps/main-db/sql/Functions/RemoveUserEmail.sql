--
-- Take an address off an account.
--
-- The primary is refused: it is the address its owner signs in with, and
-- removing it would leave an account whose login name resolves to nothing an
-- identity provider can mail. Making another address primary first is the
-- path, and the message says so rather than only saying no.
--
-- An address belonging to somebody else is refused with the schema's
-- authorization message rather than a "no such address", which would confirm
-- that it exists. dbo.SetDefaultPaymentMethod answers an unowned method the
-- same way.
--
CREATE FUNCTION "dbo"."RemoveUserEmail" (
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
        _IsPrimary boolean;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        SELECT "UserEmails"."IsPrimary" INTO _IsPrimary
        FROM "dbo"."UserEmails"
        WHERE "UserEmails"."UserEmailUUID" = _UserEmailUUID
            AND "UserEmails"."UserUUID" = _UserUUID;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;
        IF _IsPrimary THEN
            RAISE EXCEPTION 'The primary email address cannot be removed. Make another email address primary first.';
        END IF;

        DELETE FROM "dbo"."UserEmails"
        WHERE "UserEmails"."UserEmailUUID" = _UserEmailUUID;

        RETURN QUERY SELECT * FROM "dbo"."GetUserEmails"(_LoginName);
    END;
$$ LANGUAGE plpgsql;
