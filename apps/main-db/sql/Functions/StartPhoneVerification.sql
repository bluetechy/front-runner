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
-- **The three limits below are enforced here rather than in main-api**, which
-- is where the two comparable functions leave the question. Mail is free and a
-- text message is not, and nothing else in this system holds the timestamps
-- that a limit has to read: main-api keeps no state between requests, so a
-- limit up there would be a count fetched, decided on and acted on in three
-- steps that two requests can interleave. Here it is one statement.
--
--   * Sixty seconds between messages to an account. Long enough that a double
--     press of "Send the code" costs one message, short enough that somebody
--     who genuinely did not receive the first is not left waiting.
--   * Five to an account in a rolling hour, which is the ceiling on what a
--     logged-in account can spend by holding the button down.
--   * Three to a number in a rolling hour, counted across every account. This
--     is the one that is not about money: the number on this form belongs to
--     whoever was typed into it, and without this, the form is a way to make
--     a stranger's phone ring.
--
-- Both caps answer the same sentence, so that the form cannot be used to ask
-- whether some other account has been sending codes to a given number.
--
-- A row is written before the message goes, so a send that fails at the
-- gateway still counts against these. That is the safe direction to be wrong
-- in: the alternative is a failing gateway that can be retried without limit.
--
-- What comes back is the row, so the caller can say when the message went
-- without reading the table again.
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
        _LastSentAt TIMESTAMPTZ;
        _Wait integer;
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

        SELECT max("PhoneVerifications"."SentAt") INTO _LastSentAt
        FROM "dbo"."PhoneVerifications"
        WHERE "PhoneVerifications"."SubjectId" = btrim(_SubjectId);

        IF _LastSentAt IS NOT NULL THEN
            _Wait := ceil(60 - EXTRACT(EPOCH FROM CURRENT_TIMESTAMP - _LastSentAt));
            IF _Wait > 0 THEN
                RAISE EXCEPTION 'Wait % seconds before asking for another code.', _Wait;
            END IF;
        END IF;

        IF (SELECT count(*) FROM "dbo"."PhoneVerifications"
                WHERE "PhoneVerifications"."SubjectId" = btrim(_SubjectId)
                    AND "PhoneVerifications"."SentAt" > CURRENT_TIMESTAMP - interval '1 hour') >= 5 THEN
            RAISE EXCEPTION 'Too many codes have been sent. Try again in an hour.';
        END IF;

        IF (SELECT count(*) FROM "dbo"."PhoneVerifications"
                WHERE "PhoneVerifications"."PhoneNumber" = btrim(_PhoneNumber)
                    AND "PhoneVerifications"."SentAt" > CURRENT_TIMESTAMP - interval '1 hour') >= 3 THEN
            RAISE EXCEPTION 'Too many codes have been sent. Try again in an hour.';
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
