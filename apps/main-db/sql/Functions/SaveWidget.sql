--
-- Save a definition, as a new version of a widget.
--
-- Called with no id it creates the widget and mints its public one; called
-- with an id it adds the next version to a widget the caller already owns.
-- One function rather than AddWidget and UpdateWidget, because the studio
-- page has one button and the difference between the two is whether it has an
-- id in its hand.
--
-- **This function does not validate the definition and must not start.** What
-- a valid widget is has one authority, and it is the JSON Schema in
-- main-api -- see apps/main-api/src/widgets/widget.schema.ts. A second
-- opinion written in plpgsql would be a second thing to keep in step with the
-- language, and it would be the one nobody remembers to update. What this
-- function does check is that the caller may write here at all, which is the
-- question SQL is the right place for.
--
-- The id is 'w_' and sixteen random bytes. It is the only name that leaves
-- the database, it is served to a page carrying no token, and so it has to be
-- unguessable rather than sequential: see sql/Tables/Widgets.sql.
--
CREATE FUNCTION "dbo"."SaveWidget" (
    _LoginName varchar(64),
    _WidgetId varchar(34),
    _Name varchar(200),
    _Definition jsonb
) RETURNS TABLE(
    "WidgetId" varchar(34),
    "Name" varchar(200),
    "Version" integer,
    "UpdatedAt" TIMESTAMPTZ
) AS $$
    DECLARE
        _UserUUID uuid;
        _WidgetUUID uuid;
        _Version integer;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        IF _Name IS NULL OR btrim(_Name) = '' THEN
            RAISE EXCEPTION 'A widget needs a name.';
        END IF;

        IF _WidgetId IS NULL THEN
            INSERT INTO "dbo"."Widgets" ("WidgetId", "UserUUID", "Name", "CreatedBy")
            VALUES (
                'w_' || encode(public.gen_random_bytes(16), 'hex'),
                _UserUUID,
                btrim(_Name),
                _LoginName
            )
            RETURNING "Widgets"."WidgetUUID" INTO _WidgetUUID;
        ELSE
            -- Somebody else's widget is refused the same way a widget that
            -- does not exist is, and with the schema's own authorization
            -- message: answering "no such widget" for one and "not yours" for
            -- the other would confirm which ids are real.
            SELECT "Widgets"."WidgetUUID" INTO _WidgetUUID FROM "dbo"."Widgets"
            WHERE "Widgets"."WidgetId" = _WidgetId
                AND "Widgets"."UserUUID" = _UserUUID;

            IF _WidgetUUID IS NULL THEN
                RAISE EXCEPTION 'Action cannot be performed.';
            END IF;
        END IF;

        SELECT coalesce(max("WidgetVersions"."Version"), 0) + 1 INTO _Version
        FROM "dbo"."WidgetVersions"
        WHERE "WidgetVersions"."WidgetUUID" = _WidgetUUID;

        INSERT INTO "dbo"."WidgetVersions" (
            "WidgetUUID", "Version", "SchemaVersion", "Definition", "CreatedBy"
        ) VALUES (
            _WidgetUUID,
            _Version,
            -- Lifted out of the document so that "which of these are v1" does
            -- not mean reading every definition. The schema requires it, so a
            -- definition that reached here has one.
            coalesce(_Definition->>'schemaVersion', '1.0'),
            _Definition,
            _LoginName
        );

        -- The name and the served version move together with the version that
        -- introduced them, so a widget is never pointing at a version that is
        -- not there.
        UPDATE "dbo"."Widgets"
        SET "CurrentVersion" = _Version,
            "Name" = btrim(_Name),
            "UpdatedBy" = _LoginName
        WHERE "Widgets"."WidgetUUID" = _WidgetUUID;

        RETURN QUERY
        SELECT "Widgets"."WidgetId", "Widgets"."Name", "Widgets"."CurrentVersion",
            "Widgets"."UpdatedAt"
        FROM "dbo"."Widgets"
        WHERE "Widgets"."WidgetUUID" = _WidgetUUID;
    END;
$$ LANGUAGE plpgsql;
