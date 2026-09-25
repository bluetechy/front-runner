--
-- What has happened to one account lately, newest first.
--
-- The whole of the security page's RECENT ACTIVITY LOG section, and the only
-- reader of "dbo"."SecurityEvents" there is. It answers with the review
-- columns rather than a flag derived from them, because the page shows both
-- halves: "ReviewedAt" IS NULL is the New mark, and "Recognized" is what the
-- person said when it is not.
--
-- _Days is how "recent" is defined, and it is a window rather than a row cap:
-- main-api asks for thirty days and the page says so in the sentence above the
-- table, which pages what comes back twenty rows at a time. A cap could not be
-- said out loud that way. "Your last twenty" is a sentence nobody can check
-- against their own week, and on a busy account it hides yesterday behind this
-- morning; a month is a length somebody can hold in their head, and everything
-- that happened inside it comes back. 0 or NULL means every row, which is the
-- shape the point readers and dbo.GetNotifications take for their own cap.
--
-- The window is shorter than the retention trigger, which keeps twelve months.
-- That is deliberate: what is kept and what is shown are different questions,
-- and the longer answer is the one an investigation needs.
--
-- An account that does not exist has no security events rather than an error,
-- the way an unknown login has an empty wallet. There is nothing secret in
-- "nothing has happened to you".
--
CREATE FUNCTION "dbo"."GetSecurityEvents" (
    _LoginName varchar(64),
    _Days integer DEFAULT NULL
) RETURNS TABLE(
    "SecurityEventUUID" uuid,
    "EventType" varchar(100),
    "Description" text,
    "Device" varchar(255),
    "Location" varchar(255),
    "OccurredAt" TIMESTAMPTZ,
    "ReviewedAt" TIMESTAMPTZ,
    "Recognized" boolean
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
            "SecurityEvents"."SecurityEventUUID",
            "SecurityEvents"."EventType",
            "SecurityEvents"."Description",
            "SecurityEvents"."Device",
            "SecurityEvents"."Location",
            "SecurityEvents"."OccurredAt",
            "SecurityEvents"."ReviewedAt",
            "SecurityEvents"."Recognized"
        FROM "dbo"."SecurityEvents"
        WHERE "SecurityEvents"."UserUUID" = _UserUUID
            AND (
                COALESCE(_Days, 0) <= 0
                OR "SecurityEvents"."OccurredAt"
                    >= CURRENT_TIMESTAMP - make_interval(days => _Days)
            )
        -- Ties break on the UUID, which is arbitrary but stable: two rows share
        -- an "OccurredAt" only when one transaction wrote both, and the list
        -- has to come back the same way twice for the browser's paging to mean
        -- anything. A row that changed places between page one and page two
        -- would be a row somebody never saw.
        ORDER BY "SecurityEvents"."OccurredAt" DESC, "SecurityEvents"."SecurityEventUUID";
    END;
$$ LANGUAGE plpgsql;
