--
-- Spend one recovery code, and say whether there was one to spend.
--
-- Unlike dbo.SpendPasswordReset, the account is named as well as the secret.
-- A reset link is followed by whoever opens a mailbox and being able to read
-- that mailbox is the whole of the proof; a recovery code is typed into the
-- login card by somebody who has already given an email address and a password
-- that main-api checked with the identity provider before ever calling this.
-- The code is the third of three things, not the only one, so it is looked up
-- within the account rather than across the table.
--
-- It answers a row or no rows rather than raising. "No such code" is the
-- ordinary outcome of somebody typing one in wrong, and main-api says the same
-- sentence for a wrong code as for a wrong password, so there is nothing here
-- for an exception to tell it that a missing row does not.
--
-- A code already spent is no code: it has been used once, which is all any of
-- them is for. Codes never expire -- a set made two years ago is exactly the
-- set somebody digs out of a drawer on the day they need it.
--
CREATE FUNCTION "dbo"."SpendRecoveryCode" (
    _SubjectId varchar(255),
    _CodeHash varchar(64)
) RETURNS TABLE(
    "RecoveryCodeUUID" uuid,
    "SpentAt" TIMESTAMPTZ,
    "RemainingCount" integer
) AS $$
    DECLARE
        _Spent uuid;
    BEGIN
        IF _SubjectId IS NULL OR btrim(_SubjectId) = '' THEN
            RAISE EXCEPTION 'An account is required.';
        END IF;
        IF _CodeHash IS NULL OR btrim(_CodeHash) = '' THEN
            RAISE EXCEPTION 'A recovery code is required.';
        END IF;

        -- Spent in the UPDATE rather than read and then written, so that two
        -- requests racing with the same code cannot both find it unspent.
        UPDATE "dbo"."RecoveryCodes" SET
            "SpentAt" = CURRENT_TIMESTAMP,
            "UpdatedBy" = 'recovery codes'
        WHERE "RecoveryCodes"."SubjectId" = btrim(_SubjectId)
            AND "RecoveryCodes"."CodeHash" = btrim(_CodeHash)
            AND "RecoveryCodes"."SpentAt" IS NULL
        RETURNING "RecoveryCodes"."RecoveryCodeUUID" INTO _Spent;

        IF _Spent IS NULL THEN
            RETURN;
        END IF;

        RETURN QUERY
        SELECT
            "Used"."RecoveryCodeUUID",
            "Used"."SpentAt",
            (
                SELECT count(*)::integer
                FROM "dbo"."RecoveryCodes" AS "Left"
                WHERE "Left"."SubjectId" = btrim(_SubjectId)
                    AND "Left"."SpentAt" IS NULL
            )
        FROM "dbo"."RecoveryCodes" AS "Used"
        WHERE "Used"."RecoveryCodeUUID" = _Spent;
    END;
$$ LANGUAGE plpgsql;
