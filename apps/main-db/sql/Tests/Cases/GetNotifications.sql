--
-- Reading one person's notifications: both states in one list, newest first,
-- with whoever caused each one, and never somebody else's.
--

CREATE FUNCTION "test"."TestGetNotifications_ReturnsReadAndUnreadInOneList" () RETURNS void AS $$
DECLARE
    _Messages text;
BEGIN
    SELECT string_agg("Notifications"."Message", ', ' ORDER BY "Notifications"."Message") INTO _Messages
    FROM "dbo"."GetNotifications"('member') AS "Notifications";
    PERFORM "test"."AssertEquals"(_Messages, 'Welcome aboard., You have a new task.',
        'the bell is not being handed both the seen and the unseen notification');
END;
$$ LANGUAGE plpgsql;

-- NULL is unread and a timestamp is read, and that is the whole of it: there
-- is no second column to disagree with.
CREATE FUNCTION "test"."TestGetNotifications_MarksTheUnreadOnesWithANullReadAt" () RETURNS void AS $$
DECLARE
    _Unread text;
BEGIN
    SELECT string_agg("Notifications"."Message", ', ') INTO _Unread
    FROM "dbo"."GetNotifications"('member') AS "Notifications"
    WHERE "Notifications"."ReadAt" IS NULL;
    PERFORM "test"."AssertEquals"(_Unread, 'You have a new task.', 'a read notification is coming back as unread, or the other way about');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetNotifications_ShowsOnlyTheAccountsOwn" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetNotifications"('owner');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'one account can see another account''s notifications');
END;
$$ LANGUAGE plpgsql;

-- Not an error. There is nothing secret in "nobody has told you anything",
-- and a reader asking for a list wants one either way.
CREATE FUNCTION "test"."TestGetNotifications_IsEmptyForAnAccountThatDoesNotExist" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetNotifications"('nobody');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'an account that does not exist has notifications');
END;
$$ LANGUAGE plpgsql;

-- Newest first. "CreatedAt" is written explicitly rather than letting three
-- inserts take the default: CURRENT_TIMESTAMP does not move inside a
-- transaction, so all three would arrive at the same instant and the sort
-- would have nothing but the UUID left to go on. See apps/main-db/CLAUDE.md.
CREATE FUNCTION "test"."TestGetNotifications_PutsTheNewestFirst" () RETURNS void AS $$
DECLARE
    _Order text;
BEGIN
    INSERT INTO "dbo"."Notifications" ("UserUUID", "OrganizationUUID", "NotificationType", "Message", "CreatedAt", "CreatedBy") VALUES
        ("test"."Fixture"('User.Owner'), "test"."Fixture"('Organization.Acme'), 'Mention', 'Oldest', CURRENT_TIMESTAMP - interval '3 days', 'test'),
        ("test"."Fixture"('User.Owner'), "test"."Fixture"('Organization.Acme'), 'Mention', 'Newest', CURRENT_TIMESTAMP - interval '1 hour', 'test'),
        ("test"."Fixture"('User.Owner'), "test"."Fixture"('Organization.Acme'), 'Mention', 'Middle', CURRENT_TIMESTAMP - interval '2 days', 'test');

    SELECT string_agg("Notifications"."Message", ',') INTO _Order
    FROM "dbo"."GetNotifications"('owner') AS "Notifications";
    PERFORM "test"."AssertEquals"(_Order, 'Newest,Middle,Oldest', 'the list is not newest-first by when each notification arrived');
END;
$$ LANGUAGE plpgsql;

-- The same optional cap the point readers take. The API passes nothing, so
-- the badge counting the unread ones is counting all of them.
CREATE FUNCTION "test"."TestGetNotifications_HonoursTheRowLimit" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetNotifications"('member', 1);
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'the row limit was not applied');

    SELECT count(*) INTO _Count FROM "dbo"."GetNotifications"('member', 0);
    PERFORM "test"."AssertEquals"(_Count, 2::bigint, 'a limit of zero should mean every row');

    SELECT count(*) INTO _Count FROM "dbo"."GetNotifications"('member', NULL);
    PERFORM "test"."AssertEquals"(_Count, 2::bigint, 'no limit should mean every row');
END;
$$ LANGUAGE plpgsql;

-- The actor is who caused it, as against the user, who is being told. It is
-- joined rather than left as a UUID because every caller that wants one wants
-- their name.
CREATE FUNCTION "test"."TestGetNotifications_NamesWhoCausedIt" () RETURNS void AS $$
DECLARE
    _Notification record;
BEGIN
    SELECT * INTO _Notification FROM "dbo"."GetNotifications"('member') AS "Notifications"
    WHERE "Notifications"."NotificationUUID" = "test"."Fixture"('Notification.Unread');

    PERFORM "test"."AssertEquals"(_Notification."ActorUUID", "test"."Fixture"('User.Owner'), 'the actor did not come back');
    PERFORM "test"."AssertEquals"(_Notification."ActorName"::text, 'Olivia Owner', 'the actor came back without a name');
END;
$$ LANGUAGE plpgsql;

-- Plenty of what this schema notifies on has nobody behind it, so the join is
-- LEFT and both columns are NULL together. A row that vanished because its
-- actor was NULL would be an inner join nobody noticed.
CREATE FUNCTION "test"."TestGetNotifications_KeepsTheOnesNobodyCaused" () RETURNS void AS $$
DECLARE
    _Notification record;
BEGIN
    SELECT * INTO _Notification FROM "dbo"."GetNotifications"('member') AS "Notifications"
    WHERE "Notifications"."NotificationUUID" = "test"."Fixture"('Notification.Read');

    PERFORM "test"."AssertEquals"(_Notification."Message", 'Welcome aboard.', 'a notification with no actor was dropped by the join');
    PERFORM "test"."AssertEquals"(_Notification."ActorUUID", NULL::uuid, 'a notification with no actor came back with one');
    PERFORM "test"."AssertEquals"(_Notification."ActorName", NULL::varchar(64), 'a notification with no actor came back with a name');
END;
$$ LANGUAGE plpgsql;

-- A disabled account is still who did it: the filter belongs on who may sign
-- in, not on what is already in somebody's history.
CREATE FUNCTION "test"."TestGetNotifications_NamesADisabledActor" () RETURNS void AS $$
DECLARE
    _ActorName varchar(64);
BEGIN
    UPDATE "dbo"."Notifications" SET "ActorUUID" = "test"."Fixture"('User.Disabled'), "UpdatedBy" = 'test'
    WHERE "Notifications"."NotificationUUID" = "test"."Fixture"('Notification.Unread');

    SELECT "Notifications"."ActorName" INTO _ActorName FROM "dbo"."GetNotifications"('member') AS "Notifications"
    WHERE "Notifications"."NotificationUUID" = "test"."Fixture"('Notification.Unread');
    PERFORM "test"."AssertEquals"(_ActorName::text, 'Dana Disabled', 'a disabled actor stopped being who did it');
END;
$$ LANGUAGE plpgsql;
