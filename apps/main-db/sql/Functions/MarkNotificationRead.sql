--
-- Mark one notification as seen, and answer with the row as it now stands.
--
-- One row rather than the whole list. It answered with the list until the bell
-- started paging: "here is everything" stops being a useful answer once the
-- caller is holding page three of it, and a mutation that returns a different
-- number of rows than the caller has on screen is worse than one that returns
-- the row that changed. The count on the badge is its own read -- see
-- main-api's notifications service.
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
    "ActorUUID" uuid,
    "ActorName" varchar(64),
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

        -- Read back through the reader rather than from the UPDATE, so the
        -- row a caller is handed is assembled exactly once, actor and all.
        RETURN QUERY SELECT * FROM "dbo"."GetNotifications"(_LoginName) AS "Read"
        WHERE "Read"."NotificationUUID" = _NotificationUUID;
    END;
$$ LANGUAGE plpgsql;
