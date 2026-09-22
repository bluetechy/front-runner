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

-- How many were marked, rather than the list: the caller is holding a page,
-- and the honest answer to "mark everything" is how much was marked.
CREATE FUNCTION "test"."TestMarkAllNotificationsRead_AnswersWithHowManyItMarked" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertEquals"("dbo"."MarkAllNotificationsRead"('member'), 1, 'the count of marked notifications is wrong');
END;
$$ LANGUAGE plpgsql;

-- The button is there whether or not there is anything to do, so clicking it
-- twice is the same as clicking it once and the second click answers zero.
CREATE FUNCTION "test"."TestMarkAllNotificationsRead_AcceptsHavingNothingToDo" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."MarkAllNotificationsRead"('member');
    PERFORM "test"."AssertEquals"("dbo"."MarkAllNotificationsRead"('member'), 0, 'marking everything read twice marked something the second time');
    PERFORM "test"."AssertEquals"("dbo"."MarkAllNotificationsRead"('owner'), 0, 'an account with no notifications marked something');
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
