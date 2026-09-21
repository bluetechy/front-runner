--
-- ReadAt is not in the draft, and without it the table cannot answer the one
-- question it exists for.
--

CREATE FUNCTION "test"."TestNotifications_FindTheUnreadOnes" () RETURNS void AS $$
DECLARE
    _Messages text;
BEGIN
    SELECT string_agg("Message", ', ' ORDER BY "Message") INTO _Messages FROM "dbo"."Notifications"
    WHERE "UserUUID" = "test"."Fixture"('User.Member') AND "ReadAt" IS NULL;
    PERFORM "test"."AssertEquals"(_Messages, 'You have a new task.', 'only the unread notification should come back');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestNotifications_StartUnread" () RETURNS void AS $$
DECLARE
    _ReadAt timestamptz;
BEGIN
    INSERT INTO "dbo"."Notifications" ("UserUUID", "OrganizationUUID", "NotificationType", "Message", "CreatedBy")
    VALUES ("test"."Fixture"('User.Owner'), "test"."Fixture"('Organization.Acme'), 'Mention', 'You were mentioned.', 'test')
    RETURNING "ReadAt" INTO _ReadAt;
    PERFORM "test"."AssertEquals"(_ReadAt, NULL::timestamptz, 'a new notification should be unread');
END;
$$ LANGUAGE plpgsql;

-- The draft made every notification about a task. Most of what this schema
-- would notify on -- a badge, an approval, a point transfer -- is not one.
CREATE FUNCTION "test"."TestNotifications_DoNotNeedATask" () RETURNS void AS $$
DECLARE
    _TaskUUID uuid;
BEGIN
    SELECT "TaskUUID" INTO _TaskUUID FROM "dbo"."Notifications"
    WHERE "NotificationUUID" = "test"."Fixture"('Notification.Read');
    PERFORM "test"."AssertEquals"(_TaskUUID, NULL::uuid, 'a notification about nothing in particular should still be storable');
END;
$$ LANGUAGE plpgsql;
