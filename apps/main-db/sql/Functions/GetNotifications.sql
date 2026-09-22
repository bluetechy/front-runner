--
-- Everything one person has been told, newest first.
--
-- "ReadAt" is what the list is for: NULL is a notification the person has not
-- seen, and it is the only thing separating the two. There is no "IsRead"
-- beside it -- one column cannot disagree with itself, and the reader that
-- wants a boolean has "ReadAt IS NULL" in front of it. See
-- sql/Tables/Notifications.sql.
--
-- Read and unread come back in one list rather than two. The bell shows both,
-- with the unread ones marked, so splitting them here would only mean the
-- caller interleaving them again by "CreatedAt".
--
-- _RowLimit is the same optional cap the point readers take -- 0 or NULL for
-- every row -- and the API passes nothing, deliberately: the badge counts the
-- unread ones in what comes back, so a cap applied here would be a badge that
-- says 50 when there are 60. When the menu grows a second page, the cap and
-- the count arrive together.
--
-- An account that does not exist has no notifications rather than an error,
-- the way an unknown login has an empty wallet: there is nothing secret in
-- "nobody has told you anything".
--
CREATE FUNCTION "dbo"."GetNotifications" (
    _LoginName varchar(64),
    _RowLimit integer DEFAULT NULL
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
            RETURN;
        END IF;

        RETURN QUERY
        SELECT
            "Notifications"."NotificationUUID",
            "Notifications"."OrganizationUUID",
            "Notifications"."TaskUUID",
            "Notifications"."NotificationType",
            "Notifications"."Message",
            "Notifications"."ReadAt",
            "Notifications"."CreatedAt"
        FROM "dbo"."Notifications"
        WHERE "Notifications"."UserUUID" = _UserUUID
        -- Ties break on the UUID, which is arbitrary but stable: two rows
        -- share a "CreatedAt" only when one transaction wrote both, and the
        -- list has to come back the same way twice.
        ORDER BY "Notifications"."CreatedAt" DESC, "Notifications"."NotificationUUID"
        LIMIT (CASE WHEN COALESCE(_RowLimit, 0) > 0 THEN _RowLimit ELSE NULL END);
    END;
$$ LANGUAGE plpgsql;
