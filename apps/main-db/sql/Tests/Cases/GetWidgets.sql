--
-- The list behind the studio page: your own widgets, and the only way to find
-- an id again once it has been pasted somewhere and forgotten.
--

CREATE FUNCTION "test"."TestGetWidgets_AnswersTheCallersOwnWidgets" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    PERFORM "dbo"."SaveWidget"('member', NULL, 'Mine', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."SaveWidget"('owner', NULL, 'Theirs', '{"schemaVersion": "1.0"}'::jsonb);

    SELECT count(*) INTO _Count FROM "dbo"."GetWidgets"('member');
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'the list held somebody else''s widgets, or lost one of its own');
END;
$$ LANGUAGE plpgsql;

-- A list, not a page of definitions: a table of names would otherwise be
-- several hundred kilobytes of JSON nobody is looking at. The output columns
-- of a RETURNS TABLE function are its named arguments, so this reads what the
-- function promises rather than what one call happened to return.
CREATE FUNCTION "test"."TestGetWidgets_CarriesNoDefinitions" () RETURNS void AS $$
DECLARE
    _Columns text[];
BEGIN
    SELECT "pg_proc"."proargnames" INTO _Columns FROM pg_proc
        JOIN pg_namespace ON ("pg_namespace"."oid" = "pg_proc"."pronamespace")
    WHERE "pg_namespace"."nspname" = 'dbo' AND "pg_proc"."proname" = 'GetWidgets';

    PERFORM "test"."AssertFalse"('Definition' = ANY(_Columns), 'the list is carrying definitions');
END;
$$ LANGUAGE plpgsql;

-- Most recently saved first, so the one somebody is working on is at the top.
--
-- The rows are inserted with their own "CreatedAt" rather than saved and then
-- updated, and that is not a shortcut. now() is fixed for a whole transaction
-- and dbo.update_modified_info overwrites "UpdatedAt" with it, so an UPDATE
-- inside a test cannot move a row's timestamp at all: both widgets would end
-- up at the same instant and the tie-break on the id would be what the test
-- was really asserting. An explicit "CreatedAt" works because
-- dbo.insert_modified_info copies it into "UpdatedAt".
CREATE FUNCTION "test"."TestGetWidgets_PutsTheMostRecentlySavedFirst" () RETURNS void AS $$
DECLARE
    _First varchar(34);
BEGIN
    INSERT INTO "dbo"."Widgets" ("WidgetId", "UserUUID", "Name", "DraftVersion", "CreatedAt", "CreatedBy")
    VALUES
        ('w_00000000000000000000000000000001', "test"."Fixture"('User.Member'), 'Older', 1, '2024-01-01 00:00:00+00', 'fixtures'),
        ('w_00000000000000000000000000000002', "test"."Fixture"('User.Member'), 'Newer', 1, '2024-06-01 00:00:00+00', 'fixtures');

    SELECT "WidgetId" INTO _First FROM "dbo"."GetWidgets"('member') LIMIT 1;
    PERFORM "test"."AssertEquals"(_First, 'w_00000000000000000000000000000002'::varchar(34),
        'the most recently saved widget is not at the top');
END;
$$ LANGUAGE plpgsql;

-- Two widgets saved in one breath have the same timestamp, because now() does
-- not move inside a transaction. The order still has to be an order.
CREATE FUNCTION "test"."TestGetWidgets_OrdersStablyWhenTwoWereSavedAtOnce" () RETURNS void AS $$
DECLARE
    _Ids text;
    _Again text;
BEGIN
    PERFORM "dbo"."SaveWidget"('member', NULL, 'One', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."SaveWidget"('member', NULL, 'Two', '{"schemaVersion": "1.0"}'::jsonb);

    SELECT string_agg("WidgetId", ',') INTO _Ids FROM "dbo"."GetWidgets"('member');
    SELECT string_agg("WidgetId", ',') INTO _Again FROM "dbo"."GetWidgets"('member');
    PERFORM "test"."AssertEquals"(_Ids, _Again, 'the list came back in a different order the second time');
END;
$$ LANGUAGE plpgsql;

-- The two numbers the page draws its whole lifecycle from: equal means
-- everything saved is live, different means there is an unpublished draft, and a
-- NULL published version means the widget is on nobody's site.
CREATE FUNCTION "test"."TestGetWidgets_SaysWhatIsDraftedAndWhatIsPublished" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Listed record;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);

    SELECT * INTO _Listed FROM "dbo"."GetWidgets"('member') WHERE "WidgetId" = _WidgetId;
    PERFORM "test"."AssertEquals"(_Listed."DraftVersion", 2, 'the list is not showing the draft');
    PERFORM "test"."AssertTrue"(_Listed."PublishedVersion" IS NULL,
        'saving a widget twice published it');

    PERFORM "dbo"."PublishWidget"('member', _WidgetId, 1);

    SELECT * INTO _Listed FROM "dbo"."GetWidgets"('member') WHERE "WidgetId" = _WidgetId;
    PERFORM "test"."AssertEquals"(_Listed."PublishedVersion", 1, 'the list is not showing what is published');
    PERFORM "test"."AssertEquals"(_Listed."DraftVersion", 2, 'publishing moved the draft');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetWidgets_RefusesALoginThatIsNotAnAccount" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        'SELECT "dbo"."GetWidgets"(''nobody'')',
        'a login that is not an account listed widgets',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

-- An account with nothing gets an empty list rather than an error: the page
-- draws its table before it knows whether there is anything to put in it.
CREATE FUNCTION "test"."TestGetWidgets_AnswersNothingForAnAccountWithNoWidgets" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetWidgets"('outsider');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'an account with no widgets did not get an empty list');
END;
$$ LANGUAGE plpgsql;
