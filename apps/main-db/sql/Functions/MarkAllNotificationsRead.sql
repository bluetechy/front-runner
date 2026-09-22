--
-- Mark everything the person has not seen as seen: the "Mark All Read" the
-- bell's menu is headed with.
--
-- One statement rather than a loop over dbo.MarkNotificationRead, so every row
-- takes the same "ReadAt" and the list cannot come back half-marked if the
-- transaction fails partway.
--
-- Only the unread rows are touched. An UPDATE over all of them would move
-- "UpdatedAt" on notifications nobody did anything to, and would rewrite the
-- moment an older one was actually seen.
--
-- Nothing unread is not an error: the button is there whether or not there is
-- anything to do, and clicking it twice is the same as clicking it once.
--
CREATE FUNCTION "dbo"."MarkAllNotificationsRead" (_LoginName varchar(64)) RETURNS TABLE(
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

        UPDATE "dbo"."Notifications"
        SET "ReadAt" = CURRENT_TIMESTAMP, "UpdatedBy" = _LoginName
        WHERE "Notifications"."UserUUID" = _UserUUID
            AND "Notifications"."ReadAt" IS NULL;

        RETURN QUERY SELECT * FROM "dbo"."GetNotifications"(_LoginName);
    END;
$$ LANGUAGE plpgsql;
