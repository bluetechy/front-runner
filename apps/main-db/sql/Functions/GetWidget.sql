--
-- The definition a browser is served, by the widget's public id.
--
-- **It takes no login name, and that is the whole of what is unusual about
-- it.** Every other read function in this schema begins by resolving an
-- account, because everything else here is somebody's. A widget is not: it is
-- drawn on a page anybody can open, by a runtime that cannot hold a
-- credential, so whatever this answers is public by construction. The id is
-- unguessable for exactly that reason, and which pages may render it is
-- decided above this -- see main-api's widgets.controller.ts, which matches
-- the browser's Origin against the list inside the definition.
--
-- **The published version, which is not the newest one.** Saving writes a
-- draft and changes nothing here; publishing is what moves what a browser
-- gets. So a widget being worked on serves the version it was last published
-- at, and a widget that has never been published, or has been unpublished,
-- answers nothing at all.
--
-- Nothing, rather than an empty definition or a refusal, and that is what lets
-- the endpoint above give one answer to three different situations: no such
-- id, saved but never published, and taken down. None of them tells a stranger
-- whether an id is real.
--
CREATE FUNCTION "dbo"."GetWidget" (
    _WidgetId varchar(34)
) RETURNS TABLE(
    "WidgetId" varchar(34),
    "Version" integer,
    "Definition" jsonb,
    "UpdatedAt" TIMESTAMPTZ
) AS $$
    BEGIN
        RETURN QUERY
        SELECT "Widgets"."WidgetId", "WidgetVersions"."Version",
            "WidgetVersions"."Definition", "WidgetVersions"."CreatedAt"
        FROM "dbo"."Widgets"
        JOIN "dbo"."WidgetVersions"
            ON "WidgetVersions"."WidgetUUID" = "Widgets"."WidgetUUID"
            AND "WidgetVersions"."Version" = "Widgets"."PublishedVersion"
        WHERE "Widgets"."WidgetId" = _WidgetId;
    END;
$$ LANGUAGE plpgsql;
