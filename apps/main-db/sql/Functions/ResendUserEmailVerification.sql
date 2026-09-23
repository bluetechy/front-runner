--
-- Replace the verification token on an unverified address and restart its
-- twenty-four hours.
--
-- A link expires, so there has to be a way to ask for another one, and it is
-- a separate function from dbo.AddUserEmail because the address is already
-- here: adding it again would be refused by the unique key, and deleting and
-- re-adding it would lose when it was first put on file.
--
-- The old token stops working the moment this runs, which is the point. A
-- verification mail that has been forwarded, quoted in a reply or left in a
-- shared mailbox is a standing key to an address until something replaces it.
--
-- An address that is already verified is refused rather than quietly
-- re-verified: there is nothing to prove, and sending mail to an address
-- somebody has already confirmed because a request said to is how a
-- verification endpoint becomes somebody else's mail cannon.
--
-- The token is main-api's to make, for the reason written on dbo.AddUserEmail.
-- Rate limiting is main-api's too: "VerificationSentAt" is written here and is
-- what such a limit would read, and nothing in this database enforces one.
--
CREATE FUNCTION "dbo"."ResendUserEmailVerification" (
    _LoginName varchar(64),
    _UserEmailUUID uuid,
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
        _VerifiedAt TIMESTAMPTZ;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;
        IF _VerificationToken IS NULL OR btrim(_VerificationToken) = '' THEN
            RAISE EXCEPTION 'A verification token is required.';
        END IF;

        SELECT "UserEmails"."VerifiedAt" INTO _VerifiedAt
        FROM "dbo"."UserEmails"
        WHERE "UserEmails"."UserEmailUUID" = _UserEmailUUID
            AND "UserEmails"."UserUUID" = _UserUUID;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;
        IF _VerifiedAt IS NOT NULL THEN
            RAISE EXCEPTION 'That address is already verified.';
        END IF;

        UPDATE "dbo"."UserEmails" SET
            "VerificationToken" = btrim(_VerificationToken),
            "VerificationSentAt" = CURRENT_TIMESTAMP,
            "UpdatedBy" = _LoginName
        WHERE "UserEmails"."UserEmailUUID" = _UserEmailUUID;

        RETURN QUERY SELECT * FROM "dbo"."GetUserEmails"(_LoginName);
    END;
$$ LANGUAGE plpgsql;
