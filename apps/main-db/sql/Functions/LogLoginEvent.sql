--
-- Record that somebody logged in, once per login rather than once per request.
--
-- This is the one security event the application does not cause and cannot
-- simply write when it happens. Keycloak authenticates; main-api only ever
-- meets the token afterwards, and it meets it again on every request for as
-- long as that session lasts. So the writer has to be idempotent.
--
-- **The session is what makes it so.** One login is one session at the identity
-- provider, so the provider's session id is the durable answer to "have I
-- already recorded this login". The unique constraint on the table is what
-- enforces it and ON CONFLICT is what makes a repeat quiet: two requests from
-- one brand new session arriving together are a real race, and an application
-- that fires several queries as a page loads produces it regularly.
--
-- The alternative was to deduplicate on the provider's "auth_time" and store
-- nothing borrowed. It does not survive contact with Keycloak: a token from a
-- direct grant carries no "auth_time" at all, so the log would have recorded
-- nothing for whole classes of login. The claim is still used where it is
-- there, but for _when_ rather than _whether_ -- see _OccurredAt.
--
-- _OccurredAt is the provider's "auth_time" when the token carries one, which
-- is the moment somebody actually typed their password rather than the moment
-- their first request arrived. NULL means now, which is as close as this can
-- get without it and is wrong by a second or two rather than by anything a
-- reader would notice.
--
-- NULL comes back when nothing was written, which is the ordinary case rather
-- than a failure: most requests are not a new login. A token with no session id
-- writes nothing at all -- that is a machine's token, and a service account
-- calling the API is not a login to put on somebody's page.
--
CREATE FUNCTION "dbo"."LogLoginEvent" (
    _LoginName varchar(64),
    _SessionId varchar(64),
    _Description text,
    _Device varchar(255) DEFAULT NULL,
    _Location varchar(255) DEFAULT NULL,
    _OccurredAt TIMESTAMPTZ DEFAULT NULL
) RETURNS uuid AS $$
    DECLARE
        _UserUUID uuid;
        _SecurityEventUUID uuid;
    BEGIN
        IF _SessionId IS NULL OR _SessionId = '' THEN
            RETURN NULL;
        END IF;

        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RETURN NULL;
        END IF;

        -- Not through dbo.LogSecurityEvent, which is the one writer of every
        -- other row here. This one carries a column that function has no
        -- business taking, and it has to be able to lose the race rather than
        -- raise, which is what ON CONFLICT is doing. The constraint it names is
        -- named rather than inferred -- see apps/main-db/CLAUDE.md.
        INSERT INTO "dbo"."SecurityEvents" (
            "UserUUID", "EventType", "Description", "Device", "Location",
            "SessionId", "OccurredAt", "CreatedBy"
        ) VALUES (
            _UserUUID, 'LoginSucceeded', _Description, _Device, _Location,
            _SessionId, COALESCE(_OccurredAt, CURRENT_TIMESTAMP), _LoginName
        )
        ON CONFLICT ON CONSTRAINT "UX_SecurityEvents_Session" DO NOTHING
        RETURNING "SecurityEvents"."SecurityEventUUID" INTO _SecurityEventUUID;

        RETURN _SecurityEventUUID;
    END;
$$ LANGUAGE plpgsql;
