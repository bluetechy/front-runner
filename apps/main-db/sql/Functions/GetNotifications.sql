--
-- Everything one person has been told, newest first.
--
-- "ReadAt" is what the list is for: NULL is a notification the person has not
-- seen, and it is the only thing separating the two. There is no "IsRead"
-- beside it -- one column cannot disagree with itself, and the reader that
-- wants a boolean has "ReadAt IS NULL" in front of it. See
-- sql/Tables/Notifications.sql.
--
-- Read and unread come back in one list rather than two. The bell shows both
-- and filters between them, so splitting them here would only mean the caller
-- interleaving them again by "CreatedAt".
--
-- The actor is joined rather than left as a UUID, because every caller that
-- wants one wants their name: the bell draws them as the face on the row. The
-- join is LEFT, and both actor columns are NULL together -- plenty of what
-- this schema notifies on has nobody behind it.
--
-- _RowLimit is the same optional cap the point readers take -- 0 or NULL for
-- every row. main-api pages this by wrapping the call in its own LIMIT and
-- OFFSET, the way it pages dbo.GetUsers, and passes nothing here; the cap
-- stays for a caller that wants "the latest handful" without paging.
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
            RETURN;
        END IF;

        RETURN QUERY
        SELECT
            "Notifications"."NotificationUUID",
            "Notifications"."OrganizationUUID",
            "Notifications"."TaskUUID",
            "Notifications"."ActorUUID",
            "Actors"."Name",
            "Notifications"."NotificationType",
            "Notifications"."Message",
            "Notifications"."ReadAt",
            "Notifications"."CreatedAt"
        FROM "dbo"."Notifications"
        -- A disabled account is still who did it. The filter belongs on who
        -- may sign in, not on what is already in somebody's history.
        LEFT JOIN "dbo"."Users" AS "Actors"
            ON ("Actors"."UserUUID" = "Notifications"."ActorUUID")
        WHERE "Notifications"."UserUUID" = _UserUUID
        -- Ties break on the UUID, which is arbitrary but stable: two rows
        -- share a "CreatedAt" only when one transaction wrote both, and the
        -- list has to come back the same way twice. A page boundary lands in
        -- the middle of this list, so an unstable sort would show a row twice
        -- and skip another.
        ORDER BY "Notifications"."CreatedAt" DESC, "Notifications"."NotificationUUID"
        LIMIT (CASE WHEN COALESCE(_RowLimit, 0) > 0 THEN _RowLimit ELSE NULL END);
    END;
$$ LANGUAGE plpgsql;
