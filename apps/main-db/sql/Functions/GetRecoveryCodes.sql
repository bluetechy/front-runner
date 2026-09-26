--
-- What the RECOVERY CODES card shows: how many codes are left, how many were
-- made, and when.
--
-- No code ever comes back out of here, and there is nothing stored that could:
-- the table holds hashes. Codes are shown once, in the answer to the mutation
-- that made them, and an account that has lost the paper makes ten new ones
-- rather than asking to be shown the old ones again.
--
-- An account that has never made a set gets one row of zeros and a NULL date
-- rather than no rows. "None yet" is a state the card draws, and a caller that
-- had to tell an empty result apart from a failed read would be doing the same
-- work in two places. The batch is the newest one, because
-- dbo.ReplaceRecoveryCodes retires every earlier code as it writes: anything
-- unspent belongs to the newest batch by definition.
--
CREATE FUNCTION "dbo"."GetRecoveryCodes" (_SubjectId varchar(255)) RETURNS TABLE(
    "BatchId" uuid,
    "RemainingCount" integer,
    "CodeCount" integer,
    "CreatedAt" TIMESTAMPTZ
) AS $$
    BEGIN
        IF _SubjectId IS NULL OR btrim(_SubjectId) = '' THEN
            RAISE EXCEPTION 'An account is required.';
        END IF;

        RETURN QUERY
        SELECT
            "Newest"."BatchId",
            "Newest"."RemainingCount",
            "Newest"."CodeCount",
            "Newest"."CreatedAt"
        FROM (
            SELECT
                "RecoveryCodes"."BatchId",
                count(*) FILTER (WHERE "RecoveryCodes"."SpentAt" IS NULL)::integer AS "RemainingCount",
                count(*)::integer AS "CodeCount",
                min("RecoveryCodes"."CreatedAt") AS "CreatedAt"
            FROM "dbo"."RecoveryCodes"
            WHERE "RecoveryCodes"."SubjectId" = btrim(_SubjectId)
            GROUP BY "RecoveryCodes"."BatchId"
            ORDER BY min("RecoveryCodes"."CreatedAt") DESC
            LIMIT 1
        ) AS "Newest"

        UNION ALL

        -- The account that has never made a set. Written as a second branch
        -- rather than as a coalesce over the first, because the first has no
        -- row at all to coalesce over.
        SELECT NULL::uuid, 0, 0, NULL::TIMESTAMPTZ
        WHERE NOT EXISTS (
            SELECT 1 FROM "dbo"."RecoveryCodes"
            WHERE "RecoveryCodes"."SubjectId" = btrim(_SubjectId)
        );
    END;
$$ LANGUAGE plpgsql;
