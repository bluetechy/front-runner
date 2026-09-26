--
-- Saving a widget: what it mints the first time, what it appends every time
-- after, and whose widgets a caller may write to.
--

-- The first save is the whole of creation: a widget, its public id and
-- version 1, from a call that had no id to give.
CREATE FUNCTION "test"."TestSaveWidget_CreatesAWidgetAndItsFirstVersion" () RETURNS void AS $$
DECLARE
    _Saved record;
BEGIN
    SELECT * INTO _Saved FROM "dbo"."SaveWidget"('member', NULL, 'Black Friday banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 1200}, "root": {"id": "root", "type": "container"}}'::jsonb);

    PERFORM "test"."AssertEquals"(_Saved."Version", 1, 'the first save was not version 1');
    PERFORM "test"."AssertEquals"(_Saved."Name", 'Black Friday banner'::varchar(200), 'the widget did not keep its name');
    PERFORM "test"."AssertTrue"(_Saved."WidgetId" LIKE 'w\_%', 'the widget id is not prefixed');
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

    PERFORM "test"."AssertEquals"(_Saved."Version", 2, 'the second save was not version 2');
    PERFORM "test"."AssertEquals"(_Saved."WidgetId", _WidgetId, 'saving again changed the public id');

    SELECT count(*) INTO _Versions FROM "dbo"."WidgetVersions"
    JOIN "dbo"."Widgets" ON ("Widgets"."WidgetUUID" = "WidgetVersions"."WidgetUUID")
    WHERE "Widgets"."WidgetId" = _WidgetId;
    PERFORM "test"."AssertEquals"(_Versions, 2::bigint, 'the first version was overwritten instead of kept');
END;
$$ LANGUAGE plpgsql;

-- The served version moves with the save, so a widget is never pointing at a
-- version that is not there.
CREATE FUNCTION "test"."TestSaveWidget_ServesTheVersionItJustWrote" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Served record;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 1200}}'::jsonb);
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 800}}'::jsonb);

    SELECT * INTO _Served FROM "dbo"."GetWidget"(_WidgetId);
    PERFORM "test"."AssertEquals"(_Served."Version", 2, 'the widget is still serving the old version');
    PERFORM "test"."AssertEquals"(_Served."Definition"->'canvas'->>'width', '800', 'the served definition is the old one');
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
