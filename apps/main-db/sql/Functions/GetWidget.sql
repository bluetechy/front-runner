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
-- Only the current version, and only a widget that has one. A widget whose
-- row exists but whose first version is not yet written answers nothing
-- rather than an empty definition, which is what makes "not published" and
-- "no such widget" one answer at the endpoint: neither tells a stranger
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
            AND "WidgetVersions"."Version" = "Widgets"."CurrentVersion"
        WHERE "Widgets"."WidgetId" = _WidgetId;
    END;
$$ LANGUAGE plpgsql;
