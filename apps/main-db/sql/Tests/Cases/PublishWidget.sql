--
-- Publishing a version, which is also the whole of rollback.
--

CREATE FUNCTION "test"."TestPublishWidget_PutsAVersionInFrontOfBrowsers" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Published record;
    _Served record;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 1200}}'::jsonb);

    SELECT * INTO _Published FROM "dbo"."PublishWidget"('member', _WidgetId, 1);
    PERFORM "test"."AssertEquals"(_Published."PublishedVersion", 1, 'the widget was not published');

    SELECT * INTO _Served FROM "dbo"."GetWidget"(_WidgetId);
    PERFORM "test"."AssertEquals"(_Served."Version", 1, 'the published version is not the one being served');
END;
$$ LANGUAGE plpgsql;

--
-- The reason there is no Rollback function. Every version is still here, so
-- going back to 1 and shipping 3 are the same operation with a different
-- number, and a page that can publish can roll back without learning anything
-- new.
--
CREATE FUNCTION "test"."TestPublishWidget_IsAlsoHowAWidgetIsRolledBack" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Served record;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 1200}}'::jsonb);
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 800}}'::jsonb);
    PERFORM "dbo"."PublishWidget"('member', _WidgetId, 2);

    -- The rollback.
    PERFORM "dbo"."PublishWidget"('member', _WidgetId, 1);

    SELECT * INTO _Served FROM "dbo"."GetWidget"(_WidgetId);
    PERFORM "test"."AssertEquals"(_Served."Version", 1, 'the rollback did not take');
    PERFORM "test"."AssertEquals"(_Served."Definition"->'canvas'->>'width', '1200',
        'the rolled-back widget is serving the newer document');
END;
$$ LANGUAGE plpgsql;

-- Publishing an old version does not throw the newer ones away: the draft is
-- still where it was, so the work somebody rolled back from can be published
-- again once it is fixed.
CREATE FUNCTION "test"."TestPublishWidget_LeavesTheDraftAlone" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Published record;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);

    SELECT * INTO _Published FROM "dbo"."PublishWidget"('member', _WidgetId, 1);
    PERFORM "test"."AssertEquals"(_Published."DraftVersion", 2, 'publishing an old version moved the draft');
END;
$$ LANGUAGE plpgsql;

-- Without this the column would point at nothing and the widget would look
-- unpublished immediately after somebody published it.
CREATE FUNCTION "test"."TestPublishWidget_RefusesAVersionThatDoesNotExist" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);

    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."PublishWidget"(''member'', %L, 7)', _WidgetId),
        'a version that was never written was published',
        'has no version 7'
    );
END;
$$ LANGUAGE plpgsql;

-- A button pressed twice, or two tabs racing, both mean the same thing.
CREATE FUNCTION "test"."TestPublishWidget_PublishingTwiceIsNotAnError" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Published record;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."PublishWidget"('member', _WidgetId, 1);

    SELECT * INTO _Published FROM "dbo"."PublishWidget"('member', _WidgetId, 1);
    PERFORM "test"."AssertEquals"(_Published."PublishedVersion", 1, 'publishing the same version twice changed something');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestPublishWidget_RefusesSomebodyElsesWidget" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);

    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."PublishWidget"(''outsider'', %L, 1)', _WidgetId),
        'an outsider published somebody else''s widget',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestPublishWidget_RefusesAWidgetThatDoesNotExist" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        'SELECT "dbo"."PublishWidget"(''member'', ''w_ffffffffffffffffffffffffffffffff'', 1)',
        'a widget that does not exist was published',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;
