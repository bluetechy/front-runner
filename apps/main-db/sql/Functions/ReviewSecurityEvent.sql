--
-- Answer "do you recognize this activity?" about one event, and hand back the
-- whole list as it now stands.
--
-- The whole list rather than the row that changed, which is what
-- dbo.MarkNotificationRead does. The difference is where the paging happens:
-- the bell holds page three of a list the server is cutting up and cannot be
-- handed all of it, while this list is one window the browser already holds and
-- pages itself -- so this behaves like the email address writers on the same
-- page, which answer with the list for the same reason. Answering also writes a
-- second event, so the row that was answered is not the only thing that moved,
-- and a caller handed that row alone would be drawing a list short of a row.
--
-- An answer can be changed. Somebody who pressed "Yes, it was me" and then
-- thought again has to be able to say so, and on a security page that is the
-- direction that matters. So this upserts and moves "ReviewedAt" to when they
-- last answered. That is the opposite of dbo.MarkNotificationRead, which
-- refuses to move "ReadAt" on a second read -- being seen twice is still being
-- seen once, but being answered twice is a different answer.
--
-- _Days is passed straight through to the reader, so a caller showing the last
-- thirty days gets the last thirty days back rather than the whole log: a
-- mutation that answers with a longer list than the query did would grow the
-- table under somebody who pressed a button in it.
--
-- Somebody else's event is refused with the schema's authorization message
-- rather than "no such event", which would confirm that it exists.
--
CREATE FUNCTION "dbo"."ReviewSecurityEvent" (
    _LoginName varchar(64),
    _SecurityEventUUID uuid,
    _Recognized boolean,
    _Days integer DEFAULT NULL
) RETURNS TABLE(
    "SecurityEventUUID" uuid,
    "EventType" varchar(100),
    "Description" text,
    "Device" varchar(255),
    "Location" varchar(255),
    "OccurredAt" TIMESTAMPTZ,
    "ReviewedAt" TIMESTAMPTZ,
    "Recognized" boolean
) AS $$
    DECLARE
        _UserUUID uuid;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        IF _Recognized IS NULL THEN
            RAISE EXCEPTION 'An answer is required.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM "dbo"."SecurityEvents"
            WHERE "SecurityEvents"."SecurityEventUUID" = _SecurityEventUUID
                AND "SecurityEvents"."UserUUID" = _UserUUID) THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        UPDATE "dbo"."SecurityEvents"
        SET "ReviewedAt" = CURRENT_TIMESTAMP,
            "Recognized" = _Recognized,
            "UpdatedBy" = _LoginName
        WHERE "SecurityEvents"."SecurityEventUUID" = _SecurityEventUUID;

        -- Reporting activity is itself activity, and a security log that does
        -- not hold the moment somebody raised the alarm is missing the row an
        -- investigation starts from. It is written as its own event, so it
        -- appears in the list under the one it is about, already answered --
        -- there is nothing to ask somebody about a thing they just did.
        IF NOT _Recognized THEN
            INSERT INTO "dbo"."SecurityEvents" (
                "UserUUID", "EventType", "Description", "ReviewedAt", "Recognized", "CreatedBy"
            )
            SELECT
                _UserUUID,
                'ActivityReported',
                format('You reported activity you did not recognize: %s', "Reported"."Description"),
                CURRENT_TIMESTAMP,
                true,
                _LoginName
            FROM "dbo"."SecurityEvents" AS "Reported"
            WHERE "Reported"."SecurityEventUUID" = _SecurityEventUUID;
        END IF;

        -- Read back through the reader, so the list a caller is handed is
        -- assembled exactly once and in one order.
        RETURN QUERY SELECT * FROM "dbo"."GetSecurityEvents"(_LoginName, _Days);
    END;
$$ LANGUAGE plpgsql;
