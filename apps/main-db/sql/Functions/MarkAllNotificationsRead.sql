--
-- Mark everything the person has not seen as seen: the "Mark all read" the
-- bell's menu is headed with. Answers with how many rows that was.
--
-- A count rather than the list, for the same reason dbo.MarkNotificationRead
-- answers with one row: the caller is holding a page, and the honest answer to
-- "mark everything" is how much was marked. It is also the only answer that
-- stays the right size when somebody has two thousand of them.
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
-- anything to do, and clicking it twice is the same as clicking it once. The
-- second click answers zero.
--
CREATE FUNCTION "dbo"."MarkAllNotificationsRead" (_LoginName varchar(64)) RETURNS integer AS $$
    DECLARE
        _UserUUID uuid;
        _Marked integer;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        WITH "Marked" AS (
            UPDATE "dbo"."Notifications"
            SET "ReadAt" = CURRENT_TIMESTAMP, "UpdatedBy" = _LoginName
            WHERE "Notifications"."UserUUID" = _UserUUID
                AND "Notifications"."ReadAt" IS NULL
            RETURNING 1
        )
        SELECT count(*) INTO _Marked FROM "Marked";

        RETURN _Marked;
    END;
$$ LANGUAGE plpgsql;
