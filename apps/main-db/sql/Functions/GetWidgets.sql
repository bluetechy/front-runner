--
-- The caller's own widgets, most recently saved first.
--
-- What the studio page lists, and the only way to find an id again: the id is
-- random by design, so a widget whose id has been lost is a widget that can
-- still be served and can never be found. The definitions are not in it --
-- this is a list, and a page of definitions would be several hundred
-- kilobytes to draw a table of names.
--
CREATE FUNCTION "dbo"."GetWidgets" (
    _LoginName varchar(64)
) RETURNS TABLE(
    "WidgetId" varchar(34),
    "Name" varchar(200),
    "Version" integer,
    "CreatedAt" TIMESTAMPTZ,
    "UpdatedAt" TIMESTAMPTZ
) AS $$
    DECLARE
        _UserUUID uuid;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        RETURN QUERY
        SELECT "Widgets"."WidgetId", "Widgets"."Name", "Widgets"."CurrentVersion",
            "Widgets"."CreatedAt", "Widgets"."UpdatedAt"
        FROM "dbo"."Widgets"
        WHERE "Widgets"."UserUUID" = _UserUUID
        -- "UpdatedAt" is never null on a row in this schema: dbo.insert_modified_info
        -- copies "CreatedAt" into it, so a widget saved once and a widget edited
        -- ten times are ordered by the same column. The tie-break on the id is
        -- what keeps the order stable, which matters because now() is one
        -- instant for a whole transaction: two widgets saved in one call have
        -- the same timestamp and the page would otherwise draw them in
        -- whatever order the scan came back in.
        ORDER BY "Widgets"."UpdatedAt" DESC, "Widgets"."WidgetId";
    END;
$$ LANGUAGE plpgsql;
