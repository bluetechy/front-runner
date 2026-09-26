--
-- Write the code that has just been texted to a candidate phone number, and
-- retire whatever was outstanding before it.
--
-- The account is named by its Keycloak "sub" for the reason
-- dbo.StartPasswordReset is: who is enrolling was settled by the verified
-- token the request arrived on, and a login name here would be a second place
-- able to disagree with the first.
--
-- The code is main-api's to make, and so is the hashing: this database has no
-- source of randomness worth trusting with a secret. See
-- apps/main-db/sql/Tables/PhoneVerifications.sql.
--
-- Every earlier outstanding code for the account stops working the moment this
-- runs, which is what makes "Send it again" safe: somebody who mistyped their
-- number and asked for a second message must not leave the first code live
-- against the first number.
--
-- What comes back is the row, so the caller can say when the message went
-- without reading the table again. Rate limiting is main-api's, as it is for
-- verification mail: this writes "SentAt" and enforces nothing with it.
--
CREATE FUNCTION "dbo"."StartPhoneVerification" (
    _SubjectId varchar(255),
    _PhoneNumber varchar(20),
    _CodeHash varchar(64)
) RETURNS TABLE(
    "PhoneVerificationUUID" uuid,
    "SentAt" TIMESTAMPTZ
) AS $$
    DECLARE
        _NewUUID uuid;
    BEGIN
        IF _SubjectId IS NULL OR btrim(_SubjectId) = '' THEN
            RAISE EXCEPTION 'An account is required.';
        END IF;
        IF _PhoneNumber IS NULL OR btrim(_PhoneNumber) = '' THEN
            RAISE EXCEPTION 'A phone number is required.';
        END IF;
        IF _CodeHash IS NULL OR btrim(_CodeHash) = '' THEN
            RAISE EXCEPTION 'A verification code is required.';
        END IF;

        UPDATE "dbo"."PhoneVerifications" SET
            "SpentAt" = CURRENT_TIMESTAMP,
            "UpdatedBy" = 'phone verification'
        WHERE "PhoneVerifications"."SubjectId" = btrim(_SubjectId)
            AND "PhoneVerifications"."SpentAt" IS NULL;

        INSERT INTO "dbo"."PhoneVerifications" ("SubjectId", "PhoneNumber", "CodeHash", "CreatedBy")
            VALUES (btrim(_SubjectId), btrim(_PhoneNumber), btrim(_CodeHash), 'phone verification')
            RETURNING "PhoneVerifications"."PhoneVerificationUUID" INTO _NewUUID;

        RETURN QUERY
        SELECT
            "PhoneVerifications"."PhoneVerificationUUID",
            "PhoneVerifications"."SentAt"
        FROM "dbo"."PhoneVerifications"
        WHERE "PhoneVerifications"."PhoneVerificationUUID" = _NewUUID;
    END;
$$ LANGUAGE plpgsql;
