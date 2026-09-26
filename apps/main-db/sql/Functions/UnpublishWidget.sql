--
-- Take a widget off the sites it is on, without deleting anything.
--
-- The draft, every version and the id all stay exactly where they are; what
-- changes is that dbo.GetWidget stops answering, so a browser asking for it is
-- told the same "no such widget" as one asking for an id that was never
-- minted. That is the right answer to give a stranger, and it is why this is
-- not a delete: the widget can be published again with the same id, onto the
-- same pages, by naming a version.
--
-- Unpublishing something already unpublished is not an error, for the same
-- reason publishing twice is not.
--
CREATE FUNCTION "dbo"."UnpublishWidget" (
    _LoginName varchar(64),
    _WidgetId varchar(34)
) RETURNS TABLE(
    "WidgetId" varchar(34),
    "Name" varchar(200),
    "DraftVersion" integer,
    "PublishedVersion" integer,
    "UpdatedAt" TIMESTAMPTZ
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

        UPDATE "dbo"."Widgets"
        SET "PublishedVersion" = NULL,
            "UpdatedBy" = _LoginName
        WHERE "Widgets"."WidgetUUID" = _WidgetUUID;

        RETURN QUERY
        SELECT "Widgets"."WidgetId", "Widgets"."Name", "Widgets"."DraftVersion",
            "Widgets"."PublishedVersion", "Widgets"."UpdatedAt"
        FROM "dbo"."Widgets"
        WHERE "Widgets"."WidgetUUID" = _WidgetUUID;
    END;
$$ LANGUAGE plpgsql;
