--
-- Serving a definition by its public id: the one read in this schema that
-- asks for no account at all.
--

CREATE FUNCTION "test"."TestGetWidget_AnswersThePublishedDefinition" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Served record;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 1200}, "root": {"id": "root", "type": "container"}}'::jsonb);
    PERFORM "dbo"."PublishWidget"('member', _WidgetId, 1);

    SELECT * INTO _Served FROM "dbo"."GetWidget"(_WidgetId);
    PERFORM "test"."AssertEquals"(_Served."WidgetId", _WidgetId, 'the wrong widget came back');
    PERFORM "test"."AssertEquals"(_Served."Version", 1, 'the wrong version came back');
    PERFORM "test"."AssertEquals"(_Served."Definition"->'root'->>'id', 'root', 'the definition did not survive the round trip');
END;
$$ LANGUAGE plpgsql;

-- The point of the function. Everything else in this schema begins by
-- resolving a login, because everything else here is somebody's; a widget is
-- drawn on a page anybody can open by a runtime that cannot hold a
-- credential, so this one cannot.
CREATE FUNCTION "test"."TestGetWidget_NeedsNoAccount" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Count bigint;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner',
        '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."PublishWidget"('member', _WidgetId, 1);

    -- Nothing in the call names a caller, which is the assertion.
    SELECT count(*) INTO _Count FROM "dbo"."GetWidget"(_WidgetId);
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'a widget could not be read without an account');
END;
$$ LANGUAGE plpgsql;

-- Nothing rather than an error, and nothing rather than a row with an empty
-- definition in it: "no such widget" and "not published" are one answer, so
-- that neither tells a stranger whether an id is real.
CREATE FUNCTION "test"."TestGetWidget_AnswersNothingForAnIdThatDoesNotExist" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetWidget"('w_ffffffffffffffffffffffffffffffff');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'an id that does not exist answered with something');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetWidget_AnswersNothingForAWidgetWithNoVersionYet" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    INSERT INTO "dbo"."Widgets" ("WidgetId", "UserUUID", "Name", "CreatedBy")
    VALUES ('w_00000000000000000000000000000abc', "test"."Fixture"('User.Member'), 'Unpublished', 'fixtures');

    SELECT count(*) INTO _Count FROM "dbo"."GetWidget"('w_00000000000000000000000000000abc');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'a widget with no version answered with one');
END;
$$ LANGUAGE plpgsql;

-- The case the whole draft/publish split exists for: a widget can be saved
-- over and over without anything changing on the site it is embedded on.
CREATE FUNCTION "test"."TestGetWidget_AnswersNothingForAWidgetThatWasNeverPublished" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Count bigint;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);

    SELECT count(*) INTO _Count FROM "dbo"."GetWidget"(_WidgetId);
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'an unpublished widget is being served');
END;
$$ LANGUAGE plpgsql;

-- Saving does not change what a browser gets. This is the assertion somebody
-- reading the table will want to see before they believe the two columns.
CREATE FUNCTION "test"."TestGetWidget_KeepsServingThePublishedVersionWhileTheDraftMovesOn" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Served record;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 1200}}'::jsonb);
    PERFORM "dbo"."PublishWidget"('member', _WidgetId, 1);
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 800}}'::jsonb);

    SELECT * INTO _Served FROM "dbo"."GetWidget"(_WidgetId);
    PERFORM "test"."AssertEquals"(_Served."Version", 1, 'saving a draft changed what is being served');
    PERFORM "test"."AssertEquals"(_Served."Definition"->'canvas'->>'width', '1200',
        'the draft reached the browser');
END;
$$ LANGUAGE plpgsql;

-- One row, whatever the history is. A page is drawing one banner.
CREATE FUNCTION "test"."TestGetWidget_AnswersOneRowHoweverManyVersionsThereAre" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Count bigint;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."PublishWidget"('member', _WidgetId, 2);

    SELECT count(*) INTO _Count FROM "dbo"."GetWidget"(_WidgetId);
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'a widget with three versions answered with more than one row');
END;
$$ LANGUAGE plpgsql;
