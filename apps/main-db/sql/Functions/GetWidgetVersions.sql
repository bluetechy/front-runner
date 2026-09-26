--
-- Every version of one of the author's widgets, newest first.
--
-- What a history panel draws, and what makes rollback a choice rather than a
-- guess: which versions there are, when each was written, who wrote it, and
-- which one is being served right now.
--
-- The definitions are not in it, deliberately. Twenty versions of a banner is
-- twenty documents nobody is reading, and the one being looked at is fetched by
-- dbo.GetWidgetDefinition when somebody asks for it.
--
CREATE FUNCTION "dbo"."GetWidgetVersions" (
    _LoginName varchar(64),
    _WidgetId varchar(34)
) RETURNS TABLE(
    "Version" integer,
    "SchemaVersion" varchar(10),
    "IsPublished" boolean,
    "IsDraft" boolean,
    "CreatedAt" TIMESTAMPTZ,
    "CreatedBy" varchar(64)
) AS $$
    DECLARE
        _UserUUID uuid;
        _WidgetUUID uuid;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        SELECT "Widgets"."WidgetUUID" INTO _WidgetUUID FROM "dbo"."Widgets"
        WHERE "Widgets"."WidgetId" = _WidgetId
            AND "Widgets"."UserUUID" = _UserUUID;

        IF _WidgetUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        RETURN QUERY
        SELECT "WidgetVersions"."Version", "WidgetVersions"."SchemaVersion",
            "WidgetVersions"."Version" IS NOT DISTINCT FROM "Widgets"."PublishedVersion",
            "WidgetVersions"."Version" = "Widgets"."DraftVersion",
            "WidgetVersions"."CreatedAt", "WidgetVersions"."CreatedBy"
        FROM "dbo"."WidgetVersions"
        JOIN "dbo"."Widgets"
            ON "Widgets"."WidgetUUID" = "WidgetVersions"."WidgetUUID"
        WHERE "WidgetVersions"."WidgetUUID" = _WidgetUUID
        ORDER BY "WidgetVersions"."Version" DESC;
    END;
$$ LANGUAGE plpgsql;
