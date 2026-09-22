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

-- The whole list, the way the wallet's writes answer with the whole wallet:
-- the caller is a menu with a badge on it, and one row would leave it to work
-- out what the count is now.
CREATE FUNCTION "test"."TestMarkNotificationRead_AnswersWithTheWholeList" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."MarkNotificationRead"('member', "test"."Fixture"('Notification.Unread'));
    PERFORM "test"."AssertEquals"(_Count, 2::bigint, 'marking one notification read did not answer with the whole list');
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
