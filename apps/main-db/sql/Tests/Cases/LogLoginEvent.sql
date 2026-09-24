--
-- Recording a login, which is the one security event this application does not
-- cause: Keycloak authenticates and main-api meets the token afterwards, again
-- on every request. So the writer has to be idempotent, and the identity
-- provider's session id is what makes it so.
--
-- The times here are **recent and relative**, never fixed dates. A login
-- written with a date beyond the twelve-month window is swept by its own
-- insert -- see dbo.trim_security_events.
--

CREATE FUNCTION "test"."TestLogLoginEvent_RecordsALogin" () RETURNS void AS $$
DECLARE
    _SecurityEventUUID uuid;
    _Row record;
BEGIN
    -- Written first and read second. Calling the writer inside the WHERE would
    -- run it against the snapshot the SELECT opened with, which is the moment
    -- before its own insert.
    _SecurityEventUUID := "dbo"."LogLoginEvent"('member', 'session-one', 'New login on Mac OS.', 'Mac OS');

    SELECT * INTO _Row FROM "dbo"."SecurityEvents" WHERE "SecurityEventUUID" = _SecurityEventUUID;

    PERFORM "test"."AssertEquals"(_Row."EventType", 'LoginSucceeded'::varchar, 'a login is recorded as one');
    PERFORM "test"."AssertEquals"(_Row."Device", 'Mac OS'::varchar, 'with whatever the request said it came from');
    PERFORM "test"."AssertEquals"(_Row."ReviewedAt", NULL::TIMESTAMPTZ, 'and nobody has answered for it yet');
END;
$$ LANGUAGE plpgsql;

-- The rule that makes this callable from the request path: every request in a
-- session carries the same session id, and only the first one writes.
CREATE FUNCTION "test"."TestLogLoginEvent_WritesOncePerSessionRatherThanOncePerRequest" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."LogLoginEvent"('member', 'session-one', 'New login.');

    PERFORM "test"."AssertEquals"(
        "dbo"."LogLoginEvent"('member', 'session-one', 'New login.'),
        NULL::uuid,
        'a second request from the same session should write nothing'
    );

    PERFORM "test"."AssertRowCount"(
        $sql$SELECT 1 FROM "dbo"."SecurityEvents"
             WHERE "UserUUID" = "test"."Fixture"('User.Member')
                 AND "SessionId" = 'session-one'$sql$,
        1,
        'and there should be one row, not two'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestLogLoginEvent_RecordsALaterLoginAsANewOne" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."LogLoginEvent"('member', 'session-one', 'New login.');

    PERFORM "test"."AssertTrue"(
        "dbo"."LogLoginEvent"('member', 'session-two', 'New login.') IS NOT NULL,
        'logging in again is a new session and a new event'
    );
END;
$$ LANGUAGE plpgsql;

-- Two people can hold sessions the provider numbered the same way without one
-- of them losing a login: the constraint is on the pair, not on the session
-- alone.
CREATE FUNCTION "test"."TestLogLoginEvent_KeepsOneAccountsSessionOutOfAnothers" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."LogLoginEvent"('member', 'session-one', 'New login.');

    PERFORM "test"."AssertTrue"(
        "dbo"."LogLoginEvent"('owner', 'session-one', 'New login.') IS NOT NULL,
        'the same session id on another account is another login'
    );
END;
$$ LANGUAGE plpgsql;

-- The provider's "auth_time" where the token carries one: a login happened
-- when somebody typed their password, not when their first request arrived.
CREATE FUNCTION "test"."TestLogLoginEvent_StampsItWhenTheyAuthenticatedIfItWasTold" () RETURNS void AS $$
DECLARE
    _Authenticated TIMESTAMPTZ := CURRENT_TIMESTAMP - interval '2 hours';
    _SecurityEventUUID uuid;
    _OccurredAt TIMESTAMPTZ;
BEGIN
    _SecurityEventUUID := "dbo"."LogLoginEvent"('member', 'session-one', 'New login.', NULL, NULL, _Authenticated);

    SELECT "OccurredAt" INTO _OccurredAt FROM "dbo"."SecurityEvents"
    WHERE "SecurityEventUUID" = _SecurityEventUUID;

    PERFORM "test"."AssertEquals"(_OccurredAt, _Authenticated, 'the login is stamped when it happened');
END;
$$ LANGUAGE plpgsql;

-- And now when it was not. A Keycloak direct grant carries no "auth_time",
-- which is the case that sank deduplicating on the claim in the first place.
CREATE FUNCTION "test"."TestLogLoginEvent_StampsItNowWhenTheTokenDoesNotSay" () RETURNS void AS $$
DECLARE
    _SecurityEventUUID uuid;
    _OccurredAt TIMESTAMPTZ;
BEGIN
    _SecurityEventUUID := "dbo"."LogLoginEvent"('member', 'session-one', 'New login.');

    SELECT "OccurredAt" INTO _OccurredAt FROM "dbo"."SecurityEvents"
    WHERE "SecurityEventUUID" = _SecurityEventUUID;

    PERFORM "test"."AssertEquals"(_OccurredAt, CURRENT_TIMESTAMP, 'a token that did not say lands on now');
END;
$$ LANGUAGE plpgsql;

-- A token with no session is a machine's. Recording those would put a row on
-- somebody's page every time a service account called the API.
CREATE FUNCTION "test"."TestLogLoginEvent_RecordsNothingWithoutASession" () RETURNS void AS $$
DECLARE
    _Before bigint;
    _After bigint;
BEGIN
    SELECT count(*) INTO _Before FROM "dbo"."SecurityEvents";

    PERFORM "test"."AssertEquals"(
        "dbo"."LogLoginEvent"('member', NULL, 'New login.'),
        NULL::uuid,
        'a token carrying no session is not a login'
    );
    PERFORM "test"."AssertEquals"(
        "dbo"."LogLoginEvent"('member', '', 'New login.'),
        NULL::uuid,
        'and neither is one carrying an empty string'
    );

    SELECT count(*) INTO _After FROM "dbo"."SecurityEvents";
    PERFORM "test"."AssertEquals"(_After, _Before, 'and nothing should have been written');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestLogLoginEvent_AnswersAnUnknownLoginWithNothing" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertEquals"(
        "dbo"."LogLoginEvent"('nobody', 'session-one', 'New login.'),
        NULL::uuid,
        'an unknown login should write no event'
    );
END;
$$ LANGUAGE plpgsql;

-- The session id is held to deduplicate a login and for nothing else. It is
-- not in what the page reads, so it never reaches the browser.
CREATE FUNCTION "test"."TestLogLoginEvent_KeepsTheSessionOutOfWhatThePageReads" () RETURNS void AS $$
DECLARE
    _Columns text;
BEGIN
    PERFORM "dbo"."LogLoginEvent"('member', 'session-one', 'New login.');

    SELECT string_agg("Columns"."column_name", ', ') INTO _Columns
    FROM information_schema.columns AS "Columns"
    WHERE "Columns"."table_schema" = 'dbo' AND "Columns"."table_name" = 'SecurityEvents'
        AND "Columns"."column_name" = 'SessionId';

    PERFORM "test"."AssertEquals"(_Columns, 'SessionId', 'the column is on the table');
    PERFORM "test"."AssertRowCount"(
        $sql$SELECT * FROM "dbo"."GetSecurityEvents"('member') AS "Events" WHERE "Events"."Description" IS NULL$sql$,
        0,
        'and the reader hands back rows without it'
    );
END;
$$ LANGUAGE plpgsql;

-- It reaches the page it was written for, which is the point of writing it.
CREATE FUNCTION "test"."TestLogLoginEvent_ShowsUpInTheAccountsList" () RETURNS void AS $$
DECLARE
    _Newest text;
BEGIN
    PERFORM "dbo"."LogLoginEvent"('member', 'session-one', 'New login on Mac OS.', 'Mac OS');

    SELECT "Events"."Description" INTO _Newest FROM "dbo"."GetSecurityEvents"('member', 1) AS "Events";

    PERFORM "test"."AssertEquals"(_Newest, 'New login on Mac OS.', 'the login just recorded should head the list');
END;
$$ LANGUAGE plpgsql;
