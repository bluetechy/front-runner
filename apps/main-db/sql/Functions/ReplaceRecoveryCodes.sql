--
-- Write a fresh set of recovery codes for an account, and retire whatever it
-- had before.
--
-- The account is named by its Keycloak "sub" for the reason dbo.StartPasswordReset
-- is: who the codes belong to was settled by the verified token the request
-- arrived on, and a login name here would be a second place able to disagree
-- with the first.
--
-- The codes are main-api's to make and are never seen here. What arrives is an
-- array of SHA-256 hashes, and the reason the hashing is not done in this
-- function is the reason dbo.AddUserEmail does not mint its own token: a secret
-- is only worth as much as the randomness behind it, and this database has none
-- worth trusting with one. See apps/main-db/sql/Tables/RecoveryCodes.sql.
--
-- Every earlier code stops working the moment this runs. A set of codes lives
-- in a drawer, a password manager or a screenshot, and somebody who asks for
-- new ones because they are not sure where the old ones went must not be
-- leaving ten working keys behind them.
--
-- What comes back is the batch: its id, how many codes are in it, and when it
-- was written, which is what the card shows without reading the table again.
--
CREATE FUNCTION "dbo"."ReplaceRecoveryCodes" (
    _SubjectId varchar(255),
    _CodeHashes varchar(64)[]
) RETURNS TABLE(
    "BatchId" uuid,
    "CodeCount" integer,
    "CreatedAt" TIMESTAMPTZ
) AS $$
    DECLARE
        _BatchId uuid;
        _Hash varchar(64);
    BEGIN
        IF _SubjectId IS NULL OR btrim(_SubjectId) = '' THEN
            RAISE EXCEPTION 'An account is required.';
        END IF;
        IF _CodeHashes IS NULL OR cardinality(_CodeHashes) = 0 THEN
            RAISE EXCEPTION 'At least one recovery code is required.';
        END IF;
        -- Checked before anything is retired, so a bad call leaves the account
        -- holding the codes it already had rather than none at all.
        FOREACH _Hash IN ARRAY _CodeHashes LOOP
            IF _Hash IS NULL OR btrim(_Hash) = '' THEN
                RAISE EXCEPTION 'A recovery code is required.';
            END IF;
        END LOOP;

        _BatchId := public.uuid_generate_v4();

        UPDATE "dbo"."RecoveryCodes" SET
            "SpentAt" = CURRENT_TIMESTAMP,
            "UpdatedBy" = 'recovery codes'
        WHERE "RecoveryCodes"."SubjectId" = btrim(_SubjectId)
            AND "RecoveryCodes"."SpentAt" IS NULL;

        INSERT INTO "dbo"."RecoveryCodes" ("SubjectId", "CodeHash", "BatchId", "CreatedBy")
            SELECT btrim(_SubjectId), btrim("Hash"), _BatchId, 'recovery codes'
            FROM unnest(_CodeHashes) AS "Hash";

        RETURN QUERY
        SELECT
            _BatchId,
            count(*)::integer,
            min("RecoveryCodes"."CreatedAt")
        FROM "dbo"."RecoveryCodes"
        WHERE "RecoveryCodes"."BatchId" = _BatchId;
    END;
$$ LANGUAGE plpgsql;
