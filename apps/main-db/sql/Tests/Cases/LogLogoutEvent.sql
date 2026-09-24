--
-- Recording that a session ended. The companion to dbo.LogLoginEvent, and
-- idempotent for the reason turned around: a login is one fact arriving on
-- every request, a logout is one fact arriving from up to three places that do
-- not know about each other.
--
-- Two rules carry the whole design and both are asserted below: the account
-- comes from the session's own login row rather than from anything a caller
-- supplied, and a session gets one logout row however often it is reported.
--
-- The times here are **recent and relative**, never fixed dates. A row written
-- with a date beyond the twelve-month window is swept by its own insert -- see
-- dbo.trim_security_events.
--

CREATE FUNCTION "test"."TestLogLogoutEvent_RecordsTheSessionEnding" () RETURNS void AS $$
DECLARE
    _SecurityEventUUID uuid;
    _Row record;
BEGIN
    PERFORM "dbo"."LogLoginEvent"('member', 'session-one', 'New login on Mac OS.', 'Mac OS');

    -- Written first and read second. Calling the writer inside the WHERE would
    -- run it against the snapshot the SELECT opened with, which is the moment
    -- before its own insert.
    _SecurityEventUUID := "dbo"."LogLogoutEvent"('session-one', 'You logged out on Mac OS.', 'Mac OS');

    SELECT * INTO _Row FROM "dbo"."SecurityEvents" WHERE "SecurityEventUUID" = _SecurityEventUUID;

    PERFORM "test"."AssertEquals"(_Row."EventType", 'LoggedOut'::varchar, 'a logout is recorded as one');
    PERFORM "test"."AssertEquals"(_Row."UserUUID", "test"."Fixture"('User.Member'), 'onto the account whose session it was');
    PERFORM "test"."AssertEquals"(_Row."Device", 'Mac OS'::varchar, 'with the device the browser reported');
    PERFORM "test"."AssertEquals"(_Row."ReviewedAt", NULL::TIMESTAMPTZ, 'and nobody has answered for it yet');
END;
$$ LANGUAGE plpgsql;

-- The change that made this possible. Before it, the unique constraint was on
-- the account and the session alone, so a logout collided with the login it
-- ends and could never be written at all.
CREATE FUNCTION "test"."TestLogLogoutEvent_SitsBesideTheLoginItEndsRatherThanCollidingWithIt" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."LogLoginEvent"('member', 'session-one', 'New login.');

    PERFORM "test"."AssertTrue"(
        "dbo"."LogLogoutEvent"('session-one', 'You logged out.') IS NOT NULL,
        'a logout on the same session as a login should still be written'
    );

    PERFORM "test"."AssertRowCount"(
        $sql$SELECT 1 FROM "dbo"."SecurityEvents"
             WHERE "UserUUID" = "test"."Fixture"('User.Member')
                 AND "SessionId" = 'session-one'$sql$,
        2,
        'and the session should carry two rows, the login and the logout'
    );
END;
$$ LANGUAGE plpgsql;

-- One session can be told it ended three ways: the person pressed Logout, the
-- provider recorded a LOGOUT, the provider refused a refresh for a session that
-- was already gone. All three are the same fact and the page shows it once.
CREATE FUNCTION "test"."TestLogLogoutEvent_WritesOncePerSessionHoweverManyWaysItIsToldOfIt" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."LogLoginEvent"('member', 'session-one', 'New login.');
    PERFORM "dbo"."LogLogoutEvent"('session-one', 'You logged out.');

    PERFORM "test"."AssertEquals"(
        "dbo"."LogLogoutEvent"('session-one', 'This session ended without a logout.'),
        NULL::uuid,
        'a second report of the same session ending should write nothing'
    );

    PERFORM "test"."AssertRowCount"(
        $sql$SELECT 1 FROM "dbo"."SecurityEvents"
             WHERE "UserUUID" = "test"."Fixture"('User.Member')
                 AND "EventType" = 'LoggedOut'$sql$,
        1,
        'and there should be one logout row, not two'
    );
END;
$$ LANGUAGE plpgsql;

-- The first report wins, which is why the sweep writes a LOGOUT before the
-- refused refresh that follows it: "you logged out" is the better sentence and
-- it is the one that gets there first.
CREATE FUNCTION "test"."TestLogLogoutEvent_KeepsTheFirstSentenceItWasGiven" () RETURNS void AS $$
DECLARE
    _Description text;
BEGIN
    PERFORM "dbo"."LogLoginEvent"('member', 'session-one', 'New login.');
    PERFORM "dbo"."LogLogoutEvent"('session-one', 'You logged out.');
    PERFORM "dbo"."LogLogoutEvent"('session-one', 'This session ended without a logout.');

    SELECT "SecurityEvents"."Description" INTO _Description
    FROM "dbo"."SecurityEvents"
    WHERE "SecurityEvents"."SessionId" = 'session-one'
        AND "SecurityEvents"."EventType" = 'LoggedOut';

    PERFORM "test"."AssertEquals"(_Description, 'You logged out.', 'the first report is the one kept');
END;
$$ LANGUAGE plpgsql;

-- Logging in again and logging out again is a second session and a second pair
-- of rows.
CREATE FUNCTION "test"."TestLogLogoutEvent_RecordsALaterSessionEndingAsANewOne" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."LogLoginEvent"('member', 'session-one', 'New login.');
    PERFORM "dbo"."LogLogoutEvent"('session-one', 'You logged out.');
    PERFORM "dbo"."LogLoginEvent"('member', 'session-two', 'New login.');

    PERFORM "test"."AssertTrue"(
        "dbo"."LogLogoutEvent"('session-two', 'You logged out.') IS NOT NULL,
        'logging out of a second session is a second event'
    );
END;
$$ LANGUAGE plpgsql;

-- **The rule that makes this safe to call with anything the provider said.** No
-- login row for the session means no account it can be attributed to, and a
-- guess is not available: the function takes no login name and no subject, so
-- there is nothing to guess with.
CREATE FUNCTION "test"."TestLogLogoutEvent_AnswersASessionItNeverSawALoginForWithNothing" () RETURNS void AS $$
DECLARE
    _Before bigint;
    _After bigint;
BEGIN
    SELECT count(*) INTO _Before FROM "dbo"."SecurityEvents";

    PERFORM "test"."AssertEquals"(
        "dbo"."LogLogoutEvent"('a-session-nobody-here-logged-in-with', 'You logged out.'),
        NULL::uuid,
        'a session with no login on record belongs to nobody we can name'
    );

    SELECT count(*) INTO _After FROM "dbo"."SecurityEvents";
    PERFORM "test"."AssertEquals"(_After, _Before, 'and nothing should have been written');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestLogLogoutEvent_AnswersAMissingSessionWithNothing" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertEquals"(
        "dbo"."LogLogoutEvent"(NULL, 'You logged out.'),
        NULL::uuid,
        'no session is nothing to record'
    );
    PERFORM "test"."AssertEquals"(
        "dbo"."LogLogoutEvent"('', 'You logged out.'),
        NULL::uuid,
        'and neither is an empty string'
    );
END;
$$ LANGUAGE plpgsql;

-- One account's session cannot end another's, even where the provider numbered
-- two sessions the same way: the account is looked up from the login row, so
-- the row it writes is the one that login belongs to.
CREATE FUNCTION "test"."TestLogLogoutEvent_EndsTheSessionOfWhoeverLoggedInWithIt" () RETURNS void AS $$
DECLARE
    _UserUUID uuid;
BEGIN
    PERFORM "dbo"."LogLoginEvent"('owner', 'session-one', 'New login.');

    PERFORM "dbo"."LogLogoutEvent"('session-one', 'You logged out.');

    SELECT "SecurityEvents"."UserUUID" INTO _UserUUID
    FROM "dbo"."SecurityEvents"
    WHERE "SecurityEvents"."SessionId" = 'session-one'
        AND "SecurityEvents"."EventType" = 'LoggedOut';

    PERFORM "test"."AssertEquals"(_UserUUID, "test"."Fixture"('User.Owner'), 'the logout lands on the owner, not on anybody else');
END;
$$ LANGUAGE plpgsql;

-- When the session ended, not when the sweep noticed. A mirrored logout is up
-- to one sweep late, and stamping it now would put it out of order with the
-- login above it on a page sorted by "OccurredAt".
CREATE FUNCTION "test"."TestLogLogoutEvent_StampsItWhenTheSessionActuallyEnded" () RETURNS void AS $$
DECLARE
    _Ended TIMESTAMPTZ := CURRENT_TIMESTAMP - interval '40 minutes';
    _SecurityEventUUID uuid;
    _OccurredAt TIMESTAMPTZ;
BEGIN
    PERFORM "dbo"."LogLoginEvent"('member', 'session-one', 'New login.', NULL, NULL, CURRENT_TIMESTAMP - interval '2 hours');

    _SecurityEventUUID := "dbo"."LogLogoutEvent"('session-one', 'This session ended without a logout.', NULL, _Ended);

    SELECT "OccurredAt" INTO _OccurredAt FROM "dbo"."SecurityEvents"
    WHERE "SecurityEventUUID" = _SecurityEventUUID;

    PERFORM "test"."AssertEquals"(_OccurredAt, _Ended, 'the logout is stamped when the session ended');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestLogLogoutEvent_StampsItNowWhenNobodySaid" () RETURNS void AS $$
DECLARE
    _SecurityEventUUID uuid;
    _OccurredAt TIMESTAMPTZ;
BEGIN
    PERFORM "dbo"."LogLoginEvent"('member', 'session-one', 'New login.');

    _SecurityEventUUID := "dbo"."LogLogoutEvent"('session-one', 'You logged out.');

    SELECT "OccurredAt" INTO _OccurredAt FROM "dbo"."SecurityEvents"
    WHERE "SecurityEventUUID" = _SecurityEventUUID;

    PERFORM "test"."AssertEquals"(_OccurredAt, CURRENT_TIMESTAMP, 'a report that did not say lands on now');
END;
$$ LANGUAGE plpgsql;

-- It reaches the page it was written for, above the login it ends.
CREATE FUNCTION "test"."TestLogLogoutEvent_ShowsUpInTheAccountsList" () RETURNS void AS $$
DECLARE
    _Newest text;
BEGIN
    PERFORM "dbo"."LogLoginEvent"('member', 'session-one', 'New login on Mac OS.', 'Mac OS', NULL, CURRENT_TIMESTAMP - interval '1 hour');
    PERFORM "dbo"."LogLogoutEvent"('session-one', 'You logged out on Mac OS.', 'Mac OS');

    SELECT "Events"."Description" INTO _Newest FROM "dbo"."GetSecurityEvents"('member', 1) AS "Events";

    PERFORM "test"."AssertEquals"(_Newest, 'You logged out on Mac OS.', 'the logout just recorded should head the list');
END;
$$ LANGUAGE plpgsql;
