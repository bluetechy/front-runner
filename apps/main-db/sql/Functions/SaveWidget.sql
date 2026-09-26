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
-- **Saving does not publish.** The new version becomes the draft and
-- "PublishedVersion" is not touched, so a widget already on somebody's site
-- keeps serving what it was serving until dbo.PublishWidget says otherwise.
-- The first save of a new widget therefore leaves it unpublished, and
-- dbo.GetWidget answers nothing for it.
--
-- _ExpectedDraftVersion is how two people, or one person in two tabs, are kept
-- from overwriting each other. The studio reads a definition at version 4 and
-- passes 4 back when it saves; if the draft has moved to 5 in between, this
-- refuses rather than writing 6 over work nobody has seen. NULL skips the
-- check, which is what a caller that did not open anything passes.
--
CREATE FUNCTION "dbo"."SaveWidget" (
    _LoginName varchar(64),
    _WidgetId varchar(34),
    _Name varchar(200),
    _Definition jsonb,
    _ExpectedDraftVersion integer DEFAULT NULL
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
        _Version integer;
        _DraftVersion integer;
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
            SELECT "Widgets"."WidgetUUID", "Widgets"."DraftVersion"
            INTO _WidgetUUID, _DraftVersion
            FROM "dbo"."Widgets"
            WHERE "Widgets"."WidgetId" = _WidgetId
                AND "Widgets"."UserUUID" = _UserUUID;

            IF _WidgetUUID IS NULL THEN
                RAISE EXCEPTION 'Action cannot be performed.';
            END IF;

            -- Somebody else saved while this caller was editing. Said as its
            -- own sentence rather than the authorization message, because it is
            -- not about permission and the answer to it is "look at what
            -- changed", not "ask for access".
            IF _ExpectedDraftVersion IS NOT NULL
                AND _ExpectedDraftVersion <> _DraftVersion THEN
                RAISE EXCEPTION 'That widget has been saved since you opened it (draft % is now draft %).',
                    _ExpectedDraftVersion, _DraftVersion;
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

        -- The draft moves to the version just written, and the name moves with
        -- it. "PublishedVersion" is deliberately untouched: what a browser is
        -- served changes when somebody publishes and not when somebody saves.
        UPDATE "dbo"."Widgets"
        SET "DraftVersion" = _Version,
            "Name" = btrim(_Name),
            "UpdatedBy" = _LoginName
        WHERE "Widgets"."WidgetUUID" = _WidgetUUID;

        RETURN QUERY
        SELECT "Widgets"."WidgetId", "Widgets"."Name", "Widgets"."DraftVersion",
            "Widgets"."PublishedVersion", "Widgets"."UpdatedAt"
        FROM "dbo"."Widgets"
        WHERE "Widgets"."WidgetUUID" = _WidgetUUID;
    END;
$$ LANGUAGE plpgsql;
