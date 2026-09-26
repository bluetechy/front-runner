--
-- One of the author's own widget definitions, to be read back into the studio.
--
-- This is the other half of saving, and the studio could not open a widget
-- without it: the id is random, the definition is only in the database, and
-- until this existed the page could save over a widget it had never seen.
--
-- **It is not dbo.GetWidget with a login name on it.** The two answer different
-- questions and the difference is the point:
--
--   dbo.GetWidget            the published version, to a browser, with no
--                            account involved at all
--   dbo.GetWidgetDefinition  any version, to the person who owns it, so it can
--                            be edited or compared
--
-- So this one resolves an account and refuses somebody else's widget, and it
-- will hand back a version that is not published and never was -- which is
-- exactly what a draft is.
--
-- _Version NULL means the draft, because that is what opening a widget to work
-- on it means. Naming a version is how a page shows an old one, which is what
-- makes rollback something somebody can look at before doing.
--
CREATE FUNCTION "dbo"."GetWidgetDefinition" (
    _LoginName varchar(64),
    _WidgetId varchar(34),
    _Version integer DEFAULT NULL
) RETURNS TABLE(
    "WidgetId" varchar(34),
    "Name" varchar(200),
    "Version" integer,
    "SchemaVersion" varchar(10),
    "Definition" jsonb,
    "IsPublished" boolean,
    "CreatedAt" TIMESTAMPTZ
) AS $$
    DECLARE
        _UserUUID uuid;
        _WidgetUUID uuid;
        _Wanted integer;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        SELECT "Widgets"."WidgetUUID", coalesce(_Version, "Widgets"."DraftVersion")
        INTO _WidgetUUID, _Wanted
        FROM "dbo"."Widgets"
        WHERE "Widgets"."WidgetId" = _WidgetId
            AND "Widgets"."UserUUID" = _UserUUID;

        IF _WidgetUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        -- Nothing rather than a refusal for a version that is not there: a
        -- widget saved but with no versions yet is a real state, and so is a
        -- page asking for a version number somebody has since removed.
        RETURN QUERY
        SELECT "Widgets"."WidgetId", "Widgets"."Name", "WidgetVersions"."Version",
            "WidgetVersions"."SchemaVersion", "WidgetVersions"."Definition",
            "WidgetVersions"."Version" IS NOT DISTINCT FROM "Widgets"."PublishedVersion",
            "WidgetVersions"."CreatedAt"
        FROM "dbo"."Widgets"
        JOIN "dbo"."WidgetVersions"
            ON "WidgetVersions"."WidgetUUID" = "Widgets"."WidgetUUID"
            AND "WidgetVersions"."Version" = _Wanted
        WHERE "Widgets"."WidgetUUID" = _WidgetUUID;
    END;
$$ LANGUAGE plpgsql;
