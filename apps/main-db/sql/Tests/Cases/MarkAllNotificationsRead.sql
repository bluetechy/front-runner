--
-- "Mark All Read": nothing is left unread, nothing already read is disturbed,
-- and an empty bell is not an error.
--

CREATE FUNCTION "test"."TestMarkAllNotificationsRead_LeavesNothingUnread" () RETURNS void AS $$
DECLARE
    _Unread bigint;
BEGIN
    PERFORM "dbo"."MarkAllNotificationsRead"('member');

    SELECT count(*) INTO _Unread FROM "dbo"."GetNotifications"('member') AS "Notifications"
    WHERE "Notifications"."ReadAt" IS NULL;
    PERFORM "test"."AssertEquals"(_Unread, 0::bigint, 'something is still unread after marking everything read');
END;
$$ LANGUAGE plpgsql;

-- Only the unread rows are touched, so the moment an older one was actually
-- seen survives.
CREATE FUNCTION "test"."TestMarkAllNotificationsRead_DoesNotDisturbAnAlreadyReadOne" () RETURNS void AS $$
DECLARE
    _ReadAt timestamptz;
BEGIN
    PERFORM "dbo"."MarkAllNotificationsRead"('member');

    SELECT "Notifications"."ReadAt" INTO _ReadAt FROM "dbo"."GetNotifications"('member') AS "Notifications"
    WHERE "Notifications"."NotificationUUID" = "test"."Fixture"('Notification.Read');
    PERFORM "test"."AssertEquals"(_ReadAt, '2024-01-03 00:00:00+00'::timestamptz,
        'marking everything read rewrote the moment an older one was seen');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestMarkAllNotificationsRead_LeavesOtherAccountsAlone" () RETURNS void AS $$
DECLARE
    _Unread bigint;
BEGIN
    INSERT INTO "dbo"."Notifications" ("UserUUID", "OrganizationUUID", "NotificationType", "Message", "CreatedBy")
    VALUES ("test"."Fixture"('User.Owner'), "test"."Fixture"('Organization.Acme'), 'Mention', 'You were mentioned.', 'test');

    PERFORM "dbo"."MarkAllNotificationsRead"('member');

    SELECT count(*) INTO _Unread FROM "dbo"."GetNotifications"('owner') AS "Notifications"
    WHERE "Notifications"."ReadAt" IS NULL;
    PERFORM "test"."AssertEquals"(_Unread, 1::bigint, 'one account marked another account''s notifications read');
END;
$$ LANGUAGE plpgsql;

-- The button is there whether or not there is anything to do, so clicking it
-- with an empty bell answers an empty list rather than raising.
CREATE FUNCTION "test"."TestMarkAllNotificationsRead_AcceptsHavingNothingToDo" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."MarkAllNotificationsRead"('owner');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'an account with no notifications should get an empty list back');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestMarkAllNotificationsRead_RefusesAnAccountThatDoesNotExist" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        'SELECT * FROM "dbo"."MarkAllNotificationsRead"(''nobody'')',
        'an account that does not exist was allowed to mark notifications read',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;
