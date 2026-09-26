--
-- Reading a definition back, which is the other half of saving: until this
-- existed the studio could save over a widget it had never seen.
--

CREATE FUNCTION "test"."TestGetWidgetDefinition_AnswersTheDraftByDefault" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Read record;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 1200}}'::jsonb);
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 800}}'::jsonb);

    SELECT * INTO _Read FROM "dbo"."GetWidgetDefinition"('member', _WidgetId);
    PERFORM "test"."AssertEquals"(_Read."Version", 2, 'the default read was not the draft');
    PERFORM "test"."AssertEquals"(_Read."Definition"->'canvas'->>'width', '800', 'the wrong document came back');
    PERFORM "test"."AssertEquals"(_Read."Name", 'Banner'::varchar(200), 'the name did not come back with it');
END;
$$ LANGUAGE plpgsql;

-- Naming a version is what makes rollback something somebody can look at
-- before they do it.
CREATE FUNCTION "test"."TestGetWidgetDefinition_AnswersAnOlderVersionWhenAsked" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Read record;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 1200}}'::jsonb);
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner',
        '{"schemaVersion": "1.0", "canvas": {"width": 800}}'::jsonb);

    SELECT * INTO _Read FROM "dbo"."GetWidgetDefinition"('member', _WidgetId, 1);
    PERFORM "test"."AssertEquals"(_Read."Version", 1, 'the named version was not the one returned');
    PERFORM "test"."AssertEquals"(_Read."Definition"->'canvas'->>'width', '1200', 'the wrong document came back');
END;
$$ LANGUAGE plpgsql;

-- It will hand back a version that is not published and never was, which is
-- exactly what a draft is and exactly what dbo.GetWidget refuses to do.
CREATE FUNCTION "test"."TestGetWidgetDefinition_AnswersAnUnpublishedDraft" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Read record;
    _Served bigint;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);

    SELECT count(*) INTO _Served FROM "dbo"."GetWidget"(_WidgetId);
    PERFORM "test"."AssertEquals"(_Served, 0::bigint, 'an unpublished widget is being served');

    SELECT * INTO _Read FROM "dbo"."GetWidgetDefinition"('member', _WidgetId);
    PERFORM "test"."AssertEquals"(_Read."Version", 1, 'the owner could not read their own unpublished draft');
    PERFORM "test"."AssertFalse"(_Read."IsPublished", 'an unpublished draft says it is published');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetWidgetDefinition_SaysWhichVersionIsPublished" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Draft record;
    _Live record;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."PublishWidget"('member', _WidgetId, 1);

    SELECT * INTO _Live FROM "dbo"."GetWidgetDefinition"('member', _WidgetId, 1);
    SELECT * INTO _Draft FROM "dbo"."GetWidgetDefinition"('member', _WidgetId, 2);
    PERFORM "test"."AssertTrue"(_Live."IsPublished", 'the published version does not say so');
    PERFORM "test"."AssertFalse"(_Draft."IsPublished", 'the unpublished draft says it is published');
END;
$$ LANGUAGE plpgsql;

-- The difference from dbo.GetWidget, which is the point of there being two
-- functions: this one is somebody's and refuses anybody else.
CREATE FUNCTION "test"."TestGetWidgetDefinition_RefusesSomebodyElsesWidget" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."PublishWidget"('member', _WidgetId, 1);

    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."GetWidgetDefinition"(''outsider'', %L)', _WidgetId),
        'an outsider read somebody else''s definition',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetWidgetDefinition_RefusesAWidgetThatDoesNotExist" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        'SELECT "dbo"."GetWidgetDefinition"(''member'', ''w_ffffffffffffffffffffffffffffffff'')',
        'a widget that does not exist was read',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

-- Nothing rather than a refusal: a version number somebody has typed by hand,
-- or one that was never written, is a page asking for something that is not
-- there rather than an attempt at something it may not have.
CREATE FUNCTION "test"."TestGetWidgetDefinition_AnswersNothingForAVersionThatIsNotThere" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Count bigint;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);

    SELECT count(*) INTO _Count FROM "dbo"."GetWidgetDefinition"('member', _WidgetId, 9);
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'a version that does not exist answered with something');
END;
$$ LANGUAGE plpgsql;
