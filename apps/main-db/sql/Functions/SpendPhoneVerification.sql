--
-- Check the six digits somebody typed back, and say which number they prove.
--
-- The number comes out of this function rather than in. What arrives from the
-- browser is a code and nothing else, and the number the code was sent to is
-- read off the row: a caller that passed both would let somebody hold a code
-- sent to their own phone and claim it proves a number belonging to anybody.
--
-- It answers a row or no rows rather than raising, the same way
-- dbo.SpendRecoveryCode does, because a mistyped code is the ordinary case and
-- main-api says one sentence for every way this comes to nothing.
--
-- Three things can stop a code working, and all three leave the row spent or
-- spent-equivalent so that nothing here is open-ended:
--
--   * It was right. The row is stamped and the number is answered.
--   * It was wrong. "Attempts" goes up, and at five the row is retired -- six
--     digits is a fifth of a million guesses, which is an afternoon's work
--     against a form, so the guesses rather than the entropy are what has to
--     be finite.
--   * Ten minutes have passed. A code typed off a phone that is in somebody's
--     hand is typed within a minute or two; ten is generous, and an hour would
--     be fifty-eight minutes of a live code sitting in a message list.
--
-- Only the account's own outstanding row is ever looked at, so one account's
-- code can never prove another account's number.
--
CREATE FUNCTION "dbo"."SpendPhoneVerification" (
    _SubjectId varchar(255),
    _CodeHash varchar(64)
) RETURNS TABLE(
    "PhoneVerificationUUID" uuid,
    "PhoneNumber" varchar(20),
    "SpentAt" TIMESTAMPTZ
) AS $$
    DECLARE
        _Row record;
    BEGIN
        IF _SubjectId IS NULL OR btrim(_SubjectId) = '' THEN
            RAISE EXCEPTION 'An account is required.';
        END IF;
        IF _CodeHash IS NULL OR btrim(_CodeHash) = '' THEN
            RAISE EXCEPTION 'A verification code is required.';
        END IF;

        -- The one outstanding row for the account. There is at most one:
        -- dbo.StartPhoneVerification retires the rest as it writes a new one.
        SELECT
            "PhoneVerifications"."PhoneVerificationUUID",
            "PhoneVerifications"."CodeHash",
            "PhoneVerifications"."SentAt",
            "PhoneVerifications"."Attempts"
        INTO _Row
        FROM "dbo"."PhoneVerifications"
        WHERE "PhoneVerifications"."SubjectId" = btrim(_SubjectId)
            AND "PhoneVerifications"."SpentAt" IS NULL
        ORDER BY "PhoneVerifications"."SentAt" DESC
        LIMIT 1;

        IF NOT FOUND THEN
            RETURN;
        END IF;

        -- Retired where it stands rather than merely refused, so that a code
        -- which has run out of time cannot be revived by the clock being
        -- wrong somewhere else.
        IF _Row."SentAt" + interval '10 minutes' <= CURRENT_TIMESTAMP THEN
            UPDATE "dbo"."PhoneVerifications" SET
                "SpentAt" = CURRENT_TIMESTAMP,
                "UpdatedBy" = 'phone verification'
            WHERE "PhoneVerifications"."PhoneVerificationUUID" = _Row."PhoneVerificationUUID";
            RETURN;
        END IF;

        IF _Row."CodeHash" <> btrim(_CodeHash) THEN
            UPDATE "dbo"."PhoneVerifications" SET
                "Attempts" = _Row."Attempts" + 1,
                -- Five wrong guesses and the message has to be sent again.
                "SpentAt" = CASE WHEN _Row."Attempts" + 1 >= 5 THEN CURRENT_TIMESTAMP ELSE NULL END,
                "UpdatedBy" = 'phone verification'
            WHERE "PhoneVerifications"."PhoneVerificationUUID" = _Row."PhoneVerificationUUID";
            RETURN;
        END IF;

        -- Stamped in the UPDATE with the unspent test still on it, so two
        -- requests racing with the same code cannot both find it live.
        UPDATE "dbo"."PhoneVerifications" SET
            "SpentAt" = CURRENT_TIMESTAMP,
            "UpdatedBy" = 'phone verification'
        WHERE "PhoneVerifications"."PhoneVerificationUUID" = _Row."PhoneVerificationUUID"
            AND "PhoneVerifications"."SpentAt" IS NULL;

        IF NOT FOUND THEN
            RETURN;
        END IF;

        RETURN QUERY
        SELECT
            "Proved"."PhoneVerificationUUID",
            "Proved"."PhoneNumber",
            "Proved"."SpentAt"
        FROM "dbo"."PhoneVerifications" AS "Proved"
        WHERE "Proved"."PhoneVerificationUUID" = _Row."PhoneVerificationUUID";
    END;
$$ LANGUAGE plpgsql;
