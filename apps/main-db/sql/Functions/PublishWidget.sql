--
-- Publish one of a widget's versions, which is also how it is rolled back.
--
-- There is no separate rollback and there does not need to be one: every
-- version is still in dbo.WidgetVersions, so "go back to 3" and "ship 5" are
-- the same operation with a different number. That is most of the argument for
-- keeping versions rather than overwriting them.
--
-- The version is named rather than assumed. Publishing "the latest" would make
-- this function's meaning depend on when it was called, which is exactly the
-- property somebody rolling back at speed cannot afford: they are publishing
-- the version they just read, not whatever the draft happens to be by the time
-- the request lands.
--
-- Publishing what is already published is not an error. A caller pressing the
-- button twice, or two tabs racing, both mean the same thing and both get it.
--
CREATE FUNCTION "dbo"."PublishWidget" (
    _LoginName varchar(64),
    _WidgetId varchar(34),
    _Version integer
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

        -- Somebody else's widget and a widget that does not exist are refused
        -- identically: answering differently would confirm which ids are real.
        SELECT "Widgets"."WidgetUUID" INTO _WidgetUUID FROM "dbo"."Widgets"
        WHERE "Widgets"."WidgetId" = _WidgetId
            AND "Widgets"."UserUUID" = _UserUUID;

        IF _WidgetUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        -- A version that was never written cannot be served. Without this the
        -- column would point at nothing and dbo.GetWidget would answer an
        -- unpublished-looking nothing for a widget somebody had just published.
        IF NOT EXISTS (SELECT 1 FROM "dbo"."WidgetVersions"
            WHERE "WidgetVersions"."WidgetUUID" = _WidgetUUID
                AND "WidgetVersions"."Version" = _Version) THEN
            RAISE EXCEPTION 'That widget has no version %.', _Version;
        END IF;

        UPDATE "dbo"."Widgets"
        SET "PublishedVersion" = _Version,
            "UpdatedBy" = _LoginName
        WHERE "Widgets"."WidgetUUID" = _WidgetUUID;

        RETURN QUERY
        SELECT "Widgets"."WidgetId", "Widgets"."Name", "Widgets"."DraftVersion",
            "Widgets"."PublishedVersion", "Widgets"."UpdatedAt"
        FROM "dbo"."Widgets"
        WHERE "Widgets"."WidgetUUID" = _WidgetUUID;
    END;
$$ LANGUAGE plpgsql;
