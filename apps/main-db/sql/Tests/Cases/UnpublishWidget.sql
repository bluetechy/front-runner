--
-- Taking a widget off the sites it is on, which deletes nothing.
--

CREATE FUNCTION "test"."TestUnpublishWidget_StopsServingIt" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Count bigint;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."PublishWidget"('member', _WidgetId, 1);
    PERFORM "dbo"."UnpublishWidget"('member', _WidgetId);

    SELECT count(*) INTO _Count FROM "dbo"."GetWidget"(_WidgetId);
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'an unpublished widget is still being served');
END;
$$ LANGUAGE plpgsql;

-- The whole point of it being a lifecycle rather than a delete: the id, the
-- draft and every version survive, so the same widget can go back onto the same
-- pages by naming a version again.
CREATE FUNCTION "test"."TestUnpublishWidget_KeepsTheWidgetAndItsVersions" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Unpublished record;
    _Versions bigint;
    _Republished record;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."SaveWidget"('member', _WidgetId, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);
    PERFORM "dbo"."PublishWidget"('member', _WidgetId, 2);

    SELECT * INTO _Unpublished FROM "dbo"."UnpublishWidget"('member', _WidgetId);
    PERFORM "test"."AssertTrue"(_Unpublished."PublishedVersion" IS NULL, 'the widget is still published');
    PERFORM "test"."AssertEquals"(_Unpublished."DraftVersion", 2, 'unpublishing moved the draft');

    SELECT count(*) INTO _Versions FROM "dbo"."GetWidgetVersions"('member', _WidgetId);
    PERFORM "test"."AssertEquals"(_Versions, 2::bigint, 'unpublishing deleted versions');

    SELECT * INTO _Republished FROM "dbo"."PublishWidget"('member', _WidgetId, 2);
    PERFORM "test"."AssertEquals"(_Republished."PublishedVersion", 2, 'the widget could not be published again');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestUnpublishWidget_UnpublishingTwiceIsNotAnError" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
    _Unpublished record;
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);

    SELECT * INTO _Unpublished FROM "dbo"."UnpublishWidget"('member', _WidgetId);
    PERFORM "test"."AssertTrue"(_Unpublished."PublishedVersion" IS NULL, 'unpublishing something unpublished failed');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestUnpublishWidget_RefusesSomebodyElsesWidget" () RETURNS void AS $$
DECLARE
    _WidgetId varchar(34);
BEGIN
    SELECT "WidgetId" INTO _WidgetId FROM "dbo"."SaveWidget"('member', NULL, 'Banner', '{"schemaVersion": "1.0"}'::jsonb);

    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."UnpublishWidget"(''outsider'', %L)', _WidgetId),
        'an outsider unpublished somebody else''s widget',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;
