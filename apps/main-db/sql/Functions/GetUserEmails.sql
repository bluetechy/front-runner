--
-- Every address one account has on file, oldest first.
--
-- Oldest first rather than primary first, which is the same choice
-- dbo.GetPaymentMethods made and for the same reason: marking an address
-- primary changes which one you sign in with, not where it sits, and a list
-- that rearranged itself under the cursor that clicked it would make somebody
-- check what they had just done. So the only thing that moves a row is adding
-- or removing one, and the address the account started with stays at the top
-- where its owner left it. Ties break on the UUID, which is arbitrary but
-- stable: a list has to come back the same way twice.
--
-- "VerificationToken" is not among the columns and must never be. It is the
-- secret from the link in the verification mail, and a list of addresses is
-- read by the browser. "IsVerified" is the derived half of "VerifiedAt" and
-- both are returned: the first is what a status column asks, the second is
-- what a sentence saying when wants.
--
-- An account that does not exist gets an empty list rather than an error,
-- matching dbo.GetPaymentMethods: there is nothing secret in "no rows".
--
CREATE FUNCTION "dbo"."GetUserEmails" (_LoginName varchar(64)) RETURNS TABLE(
    "UserEmailUUID" uuid,
    "Email" varchar(255),
    "IsPrimary" boolean,
    "IsVerified" boolean,
    "VerifiedAt" TIMESTAMPTZ,
    "CreatedAt" TIMESTAMPTZ
) AS $$
    DECLARE
        _UserUUID uuid;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RETURN;
        END IF;

        RETURN QUERY
        SELECT
            "UserEmails"."UserEmailUUID",
            "UserEmails"."Email",
            "UserEmails"."IsPrimary",
            "UserEmails"."VerifiedAt" IS NOT NULL,
            "UserEmails"."VerifiedAt",
            "UserEmails"."CreatedAt"
        FROM "dbo"."UserEmails"
        WHERE "UserEmails"."UserUUID" = _UserUUID
        ORDER BY "UserEmails"."CreatedAt" ASC, "UserEmails"."UserEmailUUID" ASC;
    END;
$$ LANGUAGE plpgsql;
