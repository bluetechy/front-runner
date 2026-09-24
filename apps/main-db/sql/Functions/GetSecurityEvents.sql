--
-- What has happened to one account, newest first.
--
-- The whole of the security page's RECENT ACTIVITY section, and the only
-- reader of "dbo"."SecurityEvents" there is. It answers with the review
-- columns rather than a flag derived from them, because the page shows both
-- halves: "ReviewedAt" IS NULL is the New mark, and "Recognized" is what the
-- person said when it is not.
--
-- _RowLimit is the same optional cap the point readers and dbo.GetNotifications
-- take: 0 or NULL for every row. This list is not paged -- main-api asks for
-- the latest handful and the page shows all of it, the way the address list
-- above it does -- so the cap is how "recent" is actually defined, and the
-- sentence on the page says the number.
--
-- An account that does not exist has no security events rather than an error,
-- the way an unknown login has an empty wallet. There is nothing secret in
-- "nothing has happened to you".
--
CREATE FUNCTION "dbo"."GetSecurityEvents" (
    _LoginName varchar(64),
    _RowLimit integer DEFAULT NULL
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
        -- Ties break on the UUID, which is arbitrary but stable: two rows share
        -- an "OccurredAt" only when one transaction wrote both, and the list
        -- has to come back the same way twice for the cap below to mean
        -- anything.
        ORDER BY "SecurityEvents"."OccurredAt" DESC, "SecurityEvents"."SecurityEventUUID"
        LIMIT (CASE WHEN COALESCE(_RowLimit, 0) > 0 THEN _RowLimit ELSE NULL END);
    END;
$$ LANGUAGE plpgsql;
