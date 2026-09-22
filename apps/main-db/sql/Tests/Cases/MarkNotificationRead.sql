--
-- Marking one notification as seen: it becomes read, it stays read at the
-- moment it was first seen, and it has to be yours.
--

CREATE FUNCTION "test"."TestMarkNotificationRead_SetsReadAt" () RETURNS void AS $$
DECLARE
    _ReadAt timestamptz;
BEGIN
    PERFORM "dbo"."MarkNotificationRead"('member', "test"."Fixture"('Notification.Unread'));

    SELECT "Notifications"."ReadAt" INTO _ReadAt FROM "dbo"."GetNotifications"('member') AS "Notifications"
    WHERE "Notifications"."NotificationUUID" = "test"."Fixture"('Notification.Unread');
    PERFORM "test"."AssertTrue"(_ReadAt IS NOT NULL, 'the notification is still unread');
END;
$$ LANGUAGE plpgsql;

-- The first time is when it was seen. A second click on a row already open
-- would otherwise rewrite that to now.
CREATE FUNCTION "test"."TestMarkNotificationRead_DoesNotMoveAnAlreadyReadOne" () RETURNS void AS $$
DECLARE
    _ReadAt timestamptz;
BEGIN
    PERFORM "dbo"."MarkNotificationRead"('member', "test"."Fixture"('Notification.Read'));

    SELECT "Notifications"."ReadAt" INTO _ReadAt FROM "dbo"."GetNotifications"('member') AS "Notifications"
    WHERE "Notifications"."NotificationUUID" = "test"."Fixture"('Notification.Read');
    PERFORM "test"."AssertEquals"(_ReadAt, '2024-01-03 00:00:00+00'::timestamptz,
        'reading a notification twice rewrote the moment it was first seen');
END;
$$ LANGUAGE plpgsql;

-- The row that changed and nothing else. It answered with the whole list until
-- the bell started paging, at which point "here is everything" stopped being a
-- useful answer to a caller holding page three.
CREATE FUNCTION "test"."TestMarkNotificationRead_AnswersWithTheOneRow" () RETURNS void AS $$
DECLARE
    _Marked record;
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."MarkNotificationRead"('member', "test"."Fixture"('Notification.Unread'));
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'marking one notification read answered with more than the row that changed');

    SELECT * INTO _Marked FROM "dbo"."MarkNotificationRead"('member', "test"."Fixture"('Notification.Unread'));
    PERFORM "test"."AssertEquals"(_Marked."NotificationUUID", "test"."Fixture"('Notification.Unread'), 'the wrong row came back');
    PERFORM "test"."AssertTrue"(_Marked."ReadAt" IS NOT NULL, 'the row came back still unread');
    -- Assembled through the reader, so it is the same shape the list is.
    PERFORM "test"."AssertEquals"(_Marked."ActorName"::text, 'Olivia Owner', 'the row came back without its actor');
END;
$$ LANGUAGE plpgsql;

-- Refused the same way a notification that does not exist is, so the answer
-- does not confirm that somebody else's exists.
CREATE FUNCTION "test"."TestMarkNotificationRead_RefusesSomebodyElsesNotification" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."MarkNotificationRead"(''owner'', %L)', "test"."Fixture"('Notification.Unread')),
        'one account can mark another account''s notification read',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestMarkNotificationRead_RefusesANotificationThatDoesNotExist" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        'SELECT * FROM "dbo"."MarkNotificationRead"(''member'', ''99999999-0000-4000-8000-000000000001'')',
        'a notification that does not exist was accepted',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestMarkNotificationRead_RefusesAnAccountThatDoesNotExist" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."MarkNotificationRead"(''nobody'', %L)', "test"."Fixture"('Notification.Unread')),
        'an account that does not exist was allowed to mark a notification read',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;
