--
-- Mark one notification as seen.
--
-- It answers with the whole list rather than the row it touched, the way the
-- wallet's writes do: the caller is a menu showing every notification and a
-- badge counting the unread ones, and handing back one row would leave it to
-- work out what the count is now.
--
-- Reading something twice is not an error and does not move "ReadAt". The
-- first time is when it was seen; a second click on a row already open would
-- otherwise rewrite that to now.
--
-- A notification belonging to somebody else is refused with the schema's
-- authorization message rather than a "no such notification", which would
-- confirm that it exists.
--
CREATE FUNCTION "dbo"."MarkNotificationRead" (
    _LoginName varchar(64),
    _NotificationUUID uuid
) RETURNS TABLE(
    "NotificationUUID" uuid,
    "OrganizationUUID" uuid,
    "TaskUUID" uuid,
    "NotificationType" varchar(50),
    "Message" text,
    "ReadAt" TIMESTAMPTZ,
    "CreatedAt" TIMESTAMPTZ
) AS $$
    DECLARE
        _UserUUID uuid;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM "dbo"."Notifications"
            WHERE "Notifications"."NotificationUUID" = _NotificationUUID
                AND "Notifications"."UserUUID" = _UserUUID) THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        UPDATE "dbo"."Notifications"
        SET "ReadAt" = CURRENT_TIMESTAMP, "UpdatedBy" = _LoginName
        WHERE "Notifications"."NotificationUUID" = _NotificationUUID
            AND "Notifications"."ReadAt" IS NULL;

        RETURN QUERY SELECT * FROM "dbo"."GetNotifications"(_LoginName);
    END;
$$ LANGUAGE plpgsql;
