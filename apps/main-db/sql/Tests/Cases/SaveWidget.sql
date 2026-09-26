--
-- Saving a widget: what it mints the first time, what it appends every time
-- after, and whose widgets a caller may write to.
--

-- The first save is the whole of creation: a widget, its public id and
-- draft 1, from a call that had no id to give.
CREATE FUNCTION "test"."TestSaveWidget_CreatesAWidgetAndItsFirstVersion" () RETURNS void AS $$
DECLARE
    _Saved record;
BEGIN
    SELECT * INTO _Saved FROM "dbo"."SaveWidget"('member', NULL, 'Black Friday banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 1200}, "root": {"id": "root", "type": "container"}}'::jsonb);

    PERFORM "test"."AssertEquals"(_Saved."DraftVersion", 1, 'the first save was not draft 1');
    PERFORM "test"."AssertEquals"(_Saved."Name", 'Black Friday banner'::varchar(200), 'the widget did not keep its name');
    PERFORM "test"."AssertTrue"(_Saved."WidgetId" LIKE 'w\_%', 'the widget id is not prefixed');
END;
$$ LANGUAGE plpgsql;

-- Saving is not publishing, which is the whole of the lifecycle: a new widget
-- is on nobody's site until somebody says so.
CREATE FUNCTION "test"."TestSaveWidget_DoesNotPublish" () RETURNS void AS $$
DECLARE
    _Saved record;
    _Served bigint;
BEGIN
    SELECT * INTO _Saved FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "test"."AssertTrue"(_Saved."PublishedVersion" IS NULL, 'saving published the widget');

    SELECT count(*) INTO _Served FROM "dbo"."GetWidget"(_Saved."WidgetId");
    PERFORM "test"."AssertEquals"(_Served, 0::bigint, 'an unpublished widget is being served');
END;
$$ LANGUAGE plpgsql;

-- And saving over a published widget leaves what is published alone, which is
-- the reason somebody can work on a live banner at all.
CREATE FUNCTION "test"."TestSaveWidget_LeavesThePublishedVersionWhereItIs" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Saved record;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."PublishWidget"('member', _WidgetId, 1);

    SELECT * INTO _Saved FROM "dbo"."SaveWidget"('member', _WidgetId, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "test"."AssertEquals"(_Saved."DraftVersion", 2, 'the draft did not move');
    PERFORM "test"."AssertEquals"(_Saved."PublishedVersion", 1, 'saving moved what is published');
END;
$$ LANGUAGE plpgsql;

--
-- The guard against two tabs overwriting each other. The studio reads a
-- definition at a version and hands that number back when it saves; a draft
-- that has moved in between means somebody else's work is about to be written
-- over, and the refusal is what turns that into a sentence on the screen.
--
CREATE FUNCTION "test"."TestSaveWidget_RefusesASaveAgainstAStaleDraft" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    -- A second save, which is the one the first tab has not seen.
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);

    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."SaveWidget"(''member'', %L, ''Banner'', ''{}''::jsonb, 1)', _WidgetId),
        'a save against a draft that had moved was allowed to overwrite it',
        'has been saved since you opened it'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSaveWidget_AcceptsASaveAgainstTheCurrentDraft" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Saved record;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);

    SELECT * INTO _Saved FROM "dbo"."SaveWidget"('member', _WidgetId, 'Banner', '{"schemaVersion": "1.0"}'::jsonb, 1);
    PERFORM "test"."AssertEquals"(_Saved."DraftVersion", 2, 'a save against the current draft was refused');
END;
$$ LANGUAGE plpgsql;

-- Passing nothing skips the check, which is what a caller that never opened a
-- widget does: the studio creating a new one has no version to be stale about.
CREATE FUNCTION "test"."TestSaveWidget_SkipsTheCheckWhenNoVersionIsNamed" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Saved record;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);

    SELECT * INTO _Saved FROM "dbo"."SaveWidget"('member', _WidgetId, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "test"."AssertEquals"(_Saved."DraftVersion", 3, 'a save with no expected version was refused');
END;
$$ LANGUAGE plpgsql;

-- The id is served to a page carrying no token, so it is the only thing
-- standing between "public to whoever has the link" and "public to whoever
-- counts". Sixteen random bytes as hex, and never the same twice.
CREATE FUNCTION "test"."TestSaveWidget_MintsAnUnguessableId" () RETURNS void AS $$
DECLARE
    _First varchar(34);
    _Second varchar(34);
BEGIN
    SELECT "WidgetId" INTO _First FROM "dbo"."SaveWidget"('member', NULL, 'One',
        '{"schemaVersion": "1.0"}'::jsonb);
    SELECT "WidgetId" INTO _Second FROM "dbo"."SaveWidget"('member', NULL, 'Two',
        '{"schemaVersion": "1.0"}'::jsonb);

    PERFORM "test"."AssertEquals"(length(_First), 34, 'a widget id is not 34 characters');
    PERFORM "test"."AssertTrue"(_First <> _Second, 'two widgets were minted the same id');
    PERFORM "test"."AssertTrue"(substring(_First from 3) ~ '^[0-9a-f]{32}$', 'a widget id is not 32 hex characters after the prefix');
END;
$$ LANGUAGE plpgsql;

-- Saving again appends. This is the property the whole table exists for: a
-- widget is embedded by an id that never changes, so an edit is a change to a
-- live page and has to be something you can look at and go back from.
CREATE FUNCTION "test"."TestSaveWidget_AppendsAVersionRatherThanOverwriting" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Saved record;
    _Versions bigint;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 1200}}'::jsonb);
    SELECT * INTO _Saved FROM "dbo"."SaveWidget"('member', _WidgetId, 'Banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 800}}'::jsonb);

    PERFORM "test"."AssertEquals"(_Saved."DraftVersion", 2, 'the second save was not draft 2');
    PERFORM "test"."AssertEquals"(_Saved."WidgetId", _WidgetId, 'saving again changed the public id');

    SELECT count(*) INTO _Versions FROM "dbo"."WidgetVersions"
    JOIN "dbo"."Widgets" ON ("Widgets"."WidgetUUID" = "WidgetVersions"."WidgetUUID")
    WHERE "Widgets"."WidgetId" = _WidgetId;
    PERFORM "test"."AssertEquals"(_Versions, 2::bigint, 'the first version was overwritten instead of kept');
END;
$$ LANGUAGE plpgsql;

-- The draft always points at the version just written, so a widget is never
-- drafted at a version that is not there.
CREATE FUNCTION "test"."TestSaveWidget_DraftsTheVersionItJustWrote" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Draft record;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 1200}}'::jsonb);
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 800}}'::jsonb);

    SELECT * INTO _Draft FROM "dbo"."GetWidgetDefinition"('member', _WidgetId);
    PERFORM "test"."AssertEquals"(_Draft."Version", 2, 'the draft is not the version just written');
    PERFORM "test"."AssertEquals"(_Draft."Definition"->'canvas'->>'width', '800', 'the draft holds the old document');
END;
$$ LANGUAGE plpgsql;

-- Lifted out of the document so that "which of these are v1" is not a read of
-- every definition on the day there is a v2 to migrate.
CREATE FUNCTION "test"."TestSaveWidget_RecordsTheSchemaVersionBesideTheDocument" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _SchemaVersion varchar(10);
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 1200}}'::jsonb);

    SELECT "WidgetVersions"."SchemaVersion" INTO _SchemaVersion FROM "dbo"."WidgetVersions"
    JOIN "dbo"."Widgets" ON ("Widgets"."WidgetUUID" = "WidgetVersions"."WidgetUUID")
    WHERE "Widgets"."WidgetId" = _WidgetId;
    PERFORM "test"."AssertEquals"(_SchemaVersion, '1.0'::varchar(10), 'the schema version was not recorded');
END;
$$ LANGUAGE plpgsql;

-- Somebody else's widget is refused exactly the way one that does not exist
-- is. Answering differently would confirm which ids are real, and the ids are
-- the only thing protecting a definition.
CREATE FUNCTION "test"."TestSaveWidget_RefusesSomebodyElsesWidget" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner',
        '{"schemaVersion": "1.0"}'::jsonb);

    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."SaveWidget"(''outsider'', %L, ''Theirs now'', ''{}''::jsonb)', _WidgetId),
        'an outsider was allowed to write a version of somebody else''s widget',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSaveWidget_RefusesAnIdThatDoesNotExist" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        'SELECT "dbo"."SaveWidget"(''member'', ''w_ffffffffffffffffffffffffffffffff'', ''Nothing'', ''{}''::jsonb)',
        'a widget that does not exist was saved to',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSaveWidget_RefusesALoginThatIsNotAnAccount" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        'SELECT "dbo"."SaveWidget"(''nobody'', NULL, ''Banner'', ''{}''::jsonb)',
        'a login that is not an account saved a widget',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

-- A widget is found again by name in a list, and a nameless one is a row
-- nobody can identify.
CREATE FUNCTION "test"."TestSaveWidget_RefusesAWidgetWithNoName" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        'SELECT "dbo"."SaveWidget"(''member'', NULL, ''   '', ''{}''::jsonb)',
        'a widget was saved with a blank name',
        'A widget needs a name.'
    );
END;
$$ LANGUAGE plpgsql;
