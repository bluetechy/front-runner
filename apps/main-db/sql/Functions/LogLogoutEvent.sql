--
-- Record that a session ended, once per session however many ways we are told.
--
-- The companion to dbo.LogLoginEvent, and idempotent for the same reason turned
-- around. A login is one fact arriving on every request; a logout is one fact
-- arriving from up to three places, none of which knows about the others:
--
--   * the person pressed Logout, and the browser said so while it still held a
--     token (the only one of the three that knows the device);
--   * the provider recorded a LOGOUT, which is also what a logout from its own
--     account pages or from another application looks like;
--   * the provider refused a token refresh because the session was already
--     gone, which is what an idle session, a session past its maximum lifespan,
--     and a session somebody revoked all look like.
--
-- All three say "this session is over", so all three write the same row and the
-- constraint keeps it one row. The first one to arrive wins and the rest answer
-- NULL, which is the ordinary case rather than a failure.
--
-- **It takes no login name and no subject id, and that is the point.** The
-- account comes from the session's own login row, which is already on this
-- table. The provider does not hand back a user on a refused refresh at all
-- (verified against Keycloak: REFRESH_TOKEN_ERROR carries a session and no
-- userId), so something had to resolve it, and resolving it from our own log
-- means nothing here has to trust a subject a caller supplied. It also makes a
-- logout row impossible without the login row it ends, which is the pairing the
-- security page exists to show: a login with no logout under it is a session
-- that may still be open.
--
-- The consequence, which is deliberate: a session this installation never saw a
-- request from has no login row, so its logout is not recorded either. That is
-- the same rule as dbo.LogLoginFailure's -- an event we cannot attribute is an
-- event we do not write -- and in practice the first page load after a login
-- writes the login row long before anybody presses Logout.
--
-- _OccurredAt is when the session actually ended, which for the two mirrored
-- cases is up to a sweep earlier than now. NULL means now.
--
CREATE FUNCTION "dbo"."LogLogoutEvent" (
    _SessionId varchar(64),
    _Description text,
    _Device varchar(255) DEFAULT NULL,
    _OccurredAt TIMESTAMPTZ DEFAULT NULL
) RETURNS uuid AS $$
    DECLARE
        _UserUUID uuid;
        _LoginName varchar(64);
        _SecurityEventUUID uuid;
    BEGIN
        IF _SessionId IS NULL OR _SessionId = '' THEN
            RETURN NULL;
        END IF;

        -- Whose session this was, according to the login we recorded for it.
        SELECT "Users"."UserUUID", "Users"."LoginName"
        INTO _UserUUID, _LoginName
        FROM "dbo"."SecurityEvents"
        INNER JOIN "dbo"."Users"
            ON "Users"."UserUUID" = "SecurityEvents"."UserUUID"
        WHERE "SecurityEvents"."SessionId" = _SessionId
            AND "SecurityEvents"."EventType" = 'LoginSucceeded';

        IF _UserUUID IS NULL THEN
            RETURN NULL;
        END IF;

        -- Not through dbo.LogSecurityEvent, for the same two reasons
        -- dbo.LogLoginEvent is not: it carries a column that function has no
        -- business taking, and it has to be able to lose the race rather than
        -- raise. The constraint is named rather than inferred -- see
        -- apps/main-db/CLAUDE.md.
        INSERT INTO "dbo"."SecurityEvents" (
            "UserUUID", "EventType", "Description", "Device", "Location",
            "SessionId", "OccurredAt", "CreatedBy"
        ) VALUES (
            _UserUUID, 'LoggedOut', _Description, _Device, NULL,
            _SessionId, COALESCE(_OccurredAt, CURRENT_TIMESTAMP), _LoginName
        )
        ON CONFLICT ON CONSTRAINT "UX_SecurityEvents_Session" DO NOTHING
        RETURNING "SecurityEvents"."SecurityEventUUID" INTO _SecurityEventUUID;

        RETURN _SecurityEventUUID;
    END;
$$ LANGUAGE plpgsql;
