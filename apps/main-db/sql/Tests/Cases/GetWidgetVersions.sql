--
-- The history behind a widget: what there is to go back to, and which one is
-- live.
--

CREATE FUNCTION "test"."TestGetWidgetVersions_ListsEveryVersionNewestFirst" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Versions integer[];
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);

    SELECT array_agg("Version") INTO _Versions FROM "dbo"."GetWidgetVersions"('member', _WidgetId);
    PERFORM "test"."AssertTrue"(_Versions = ARRAY[3, 2, 1], 'the history is not newest first');
END;
$$ LANGUAGE plpgsql;

-- The two flags a history panel draws its marks from. They are separate
-- because a widget being worked on has them on different rows, and a widget
-- that has just been published has them both on one.
CREATE FUNCTION "test"."TestGetWidgetVersions_MarksTheDraftAndThePublishedOne" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Live record;
    _Draft record;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."PublishWidget"('member', _WidgetId, 1);

    SELECT * INTO _Live FROM "dbo"."GetWidgetVersions"('member', _WidgetId) WHERE "Version" = 1;
    SELECT * INTO _Draft FROM "dbo"."GetWidgetVersions"('member', _WidgetId) WHERE "Version" = 2;

    PERFORM "test"."AssertTrue"(_Live."IsPublished", 'the published version is not marked');
    PERFORM "test"."AssertFalse"(_Live."IsDraft", 'an old version is marked as the draft');
    PERFORM "test"."AssertTrue"(_Draft."IsDraft", 'the draft is not marked');
    PERFORM "test"."AssertFalse"(_Draft."IsPublished", 'the unpublished draft is marked as published');
END;
$$ LANGUAGE plpgsql;

-- Nothing is published, so nothing is marked. A widget can sit in this state
-- for as long as somebody likes.
CREATE FUNCTION "test"."TestGetWidgetVersions_MarksNothingPublishedWhenNothingIs" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Published bigint;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);

    SELECT count(*) INTO _Published FROM "dbo"."GetWidgetVersions"('member', _WidgetId)
    WHERE "IsPublished";
    PERFORM "test"."AssertEquals"(_Published, 0::bigint, 'an unpublished widget has a published version');
END;
$$ LANGUAGE plpgsql;

-- Twenty versions of a banner is twenty documents nobody is reading. The one
-- being looked at is fetched by dbo.GetWidgetDefinition when it is asked for.
CREATE FUNCTION "test"."TestGetWidgetVersions_CarriesNoDefinitions" () RETURNS void AS $$
DECLARE
    _Columns text[];
BEGIN
    SELECT "pg_proc"."proargnames" INTO _Columns FROM pg_proc
        JOIN pg_namespace ON ("pg_namespace"."oid" = "pg_proc"."pronamespace")
    WHERE "pg_namespace"."nspname" = 'dbo' AND "pg_proc"."proname" = 'GetWidgetVersions';

    PERFORM "test"."AssertFalse"('Definition' = ANY(_Columns), 'the history is carrying definitions');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetWidgetVersions_SaysWhoWroteEachOne" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Author varchar(64);
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);

    SELECT "CreatedBy" INTO _Author FROM "dbo"."GetWidgetVersions"('member', _WidgetId) WHERE "Version" = 1;
    PERFORM "test"."AssertEquals"(_Author, 'member'::varchar(64), 'the version does not say who wrote it');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetWidgetVersions_RefusesSomebodyElsesWidget" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);

    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."GetWidgetVersions"(''outsider'', %L)', _WidgetId),
        'an outsider read somebody else''s history',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;
