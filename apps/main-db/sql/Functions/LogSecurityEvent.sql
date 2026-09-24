--
-- Write one thing that happened to an account into its security log.
--
-- The one writer. Everything that belongs on the security page goes through
-- here rather than inserting into "dbo"."SecurityEvents" directly, so there is
-- one place that says what a row has to carry and one place to change when it
-- carries more.
--
-- The description is written by the caller rather than composed from the type
-- here, for the reason "dbo"."Notifications"."Message" is: the sentence knows
-- things the type does not -- which address was added, which device logged in
-- -- and a database assembling English from a type would be the second place
-- the product's words live.
--
-- An unknown login writes nothing and answers NULL rather than raising. This
-- is a log: it is called after the thing it is recording already happened, and
-- a failure to write the record should not undo the record's subject. main-api
-- treats a NULL the same way, which is why it is safe for it to call this
-- without a transaction around both.
--
-- Nothing is reviewed when it is written. "ReviewedAt" and "Recognized" stay
-- NULL until somebody answers the question on the page, which is what puts the
-- New mark on the row -- see dbo.ReviewSecurityEvent.
--
-- _OccurredAt is for the one caller that knows better than now: a login
-- happened when the identity provider says it did, which is when somebody
-- typed their password, not when the first request carrying that session
-- reached this API. Everything else leaves it NULL and means now. See
-- dbo.LogLoginEvent.
--
-- The retention rule is not here. It is a trigger on the table, because this
-- is not the only writer -- see dbo.trim_security_events.
--
CREATE FUNCTION "dbo"."LogSecurityEvent" (
    _LoginName varchar(64),
    _EventType varchar(100),
    _Description text,
    _Device varchar(255) DEFAULT NULL,
    _Location varchar(255) DEFAULT NULL,
    _OccurredAt TIMESTAMPTZ DEFAULT NULL
) RETURNS uuid AS $$
    DECLARE
        _UserUUID uuid;
        _SecurityEventUUID uuid;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RETURN NULL;
        END IF;

        INSERT INTO "dbo"."SecurityEvents" (
            "UserUUID", "EventType", "Description", "Device", "Location", "OccurredAt", "CreatedBy"
        ) VALUES (
            _UserUUID, _EventType, _Description, _Device, _Location,
            COALESCE(_OccurredAt, CURRENT_TIMESTAMP), _LoginName
        )
        RETURNING "SecurityEvents"."SecurityEventUUID" INTO _SecurityEventUUID;

        RETURN _SecurityEventUUID;
    END;
$$ LANGUAGE plpgsql;
