--
-- The failed login, which arrives named by subject rather than by login name.
--

CREATE FUNCTION "test"."TestLogLoginFailure_WritesTheAttemptOntoTheAccountItWasAimedAt" () RETURNS void AS $$
DECLARE
    _SecurityEventUUID uuid;
    _Row record;
BEGIN
    -- Written first and read second. Calling the writer inside the WHERE would
    -- run it against the snapshot the SELECT opened with, which is the moment
    -- before its own insert, and the row would not be found.
    _SecurityEventUUID := "dbo"."LogLoginFailure"('subject-member', 'A login attempt was refused.');

    SELECT * INTO _Row FROM "dbo"."SecurityEvents" WHERE "SecurityEventUUID" = _SecurityEventUUID;

    PERFORM "test"."AssertEquals"(_Row."UserUUID", "test"."Fixture"('User.Member'), 'the subject id should resolve to the account it belongs to');
    PERFORM "test"."AssertEquals"(_Row."EventType", 'LoginFailed'::varchar, 'the type is this function''s to name, unlike the sentence');
    PERFORM "test"."AssertEquals"(_Row."Description", 'A login attempt was refused.', 'the sentence is the caller''s');
    PERFORM "test"."AssertEquals"(_Row."ReviewedAt", NULL::TIMESTAMPTZ, 'a fresh attempt has not been answered');
    PERFORM "test"."AssertEquals"(_Row."CreatedBy", 'member'::varchar, 'the account it landed on is who it was written for');
END;
$$ LANGUAGE plpgsql;

-- Nothing is known about the browser: the provider's event log records the
-- address the attempt came from and nothing else, and the address is the thing
-- this product has decided not to turn into a place.
CREATE FUNCTION "test"."TestLogLoginFailure_KnowsNeitherADeviceNorAPlace" () RETURNS void AS $$
DECLARE
    _SecurityEventUUID uuid;
    _Row record;
BEGIN
    _SecurityEventUUID := "dbo"."LogLoginFailure"('subject-member', 'A login attempt was refused.');

    SELECT * INTO _Row FROM "dbo"."SecurityEvents" WHERE "SecurityEventUUID" = _SecurityEventUUID;

    PERFORM "test"."AssertEquals"(_Row."Device", NULL::varchar, 'the provider does not say which browser tried');
    PERFORM "test"."AssertEquals"(_Row."Location", NULL::varchar, 'and the address it came from is not turned into a place');
END;
$$ LANGUAGE plpgsql;

-- The attempt happened when the provider says it did, which is some seconds or
-- minutes before the poll that found it.
CREATE FUNCTION "test"."TestLogLoginFailure_StampsTheAttemptWhenTheProviderSaysItHappened" () RETURNS void AS $$
DECLARE
    -- Recent and relative, never a fixed date: an event written beyond the
    -- twelve-month window is swept by its own insert. See
    -- dbo.trim_security_events.
    _Earlier TIMESTAMPTZ := CURRENT_TIMESTAMP - interval '4 minutes';
    _SecurityEventUUID uuid;
    _OccurredAt TIMESTAMPTZ;
BEGIN
    _SecurityEventUUID := "dbo"."LogLoginFailure"('subject-member', 'A login attempt was refused.', _Earlier);

    SELECT "OccurredAt" INTO _OccurredAt FROM "dbo"."SecurityEvents" WHERE "SecurityEventUUID" = _SecurityEventUUID;

    PERFORM "test"."AssertEquals"(_OccurredAt, _Earlier, 'the attempt is stamped when it was refused, not when it was read');
END;
$$ LANGUAGE plpgsql;

-- Somebody guessing at a username nobody holds. There is no account for the row
-- to belong to, and growing one would answer "does this account exist" to
-- whoever was guessing.
CREATE FUNCTION "test"."TestLogLoginFailure_AnswersAnUnknownSubjectWithNothing" () RETURNS void AS $$
DECLARE
    _Before bigint;
    _After bigint;
BEGIN
    SELECT count(*) INTO _Before FROM "dbo"."SecurityEvents";

    PERFORM "test"."AssertEquals"(
        "dbo"."LogLoginFailure"('subject-nobody', 'A login attempt was refused.'),
        NULL::uuid,
        'a subject this installation has never provisioned should write nothing'
    );

    SELECT count(*) INTO _After FROM "dbo"."SecurityEvents";
    PERFORM "test"."AssertEquals"(_After, _Before, 'and should leave the table as it found it');
END;
$$ LANGUAGE plpgsql;

-- An account that predates the identity provider carries no subject at all, and
-- a NULL subject must not match it. Without the guard the lookup would compare
-- NULL to NULL, find nothing, and be right by accident; the guard is here so it
-- stays right if that comparison ever changes.
CREATE FUNCTION "test"."TestLogLoginFailure_AnswersAMissingSubjectWithNothing" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertEquals"(
        "dbo"."LogLoginFailure"(NULL, 'A login attempt was refused.'),
        NULL::uuid,
        'no subject is nobody'
    );

    PERFORM "test"."AssertEquals"(
        "dbo"."LogLoginFailure"('', 'A login attempt was refused.'),
        NULL::uuid,
        'and neither is an empty one'
    );
END;
$$ LANGUAGE plpgsql;

-- It reaches the page it was written for, which is the whole point of writing
-- it: somebody else guessing at the account is what its owner wants to know.
CREATE FUNCTION "test"."TestLogLoginFailure_ShowsUpInTheAccountsList" () RETURNS void AS $$
DECLARE
    _Newest text;
BEGIN
    PERFORM "dbo"."LogLoginFailure"('subject-member', 'A login attempt was refused.');

    SELECT "Events"."EventType" INTO _Newest FROM "dbo"."GetSecurityEvents"('member', 1) AS "Events";

    PERFORM "test"."AssertEquals"(_Newest, 'LoginFailed', 'the attempt just written should be the newest one in the list');
END;
$$ LANGUAGE plpgsql;

-- A refused password does not end a session, so unlike dbo.LogLoginEvent there
-- is nothing to deduplicate on and nothing that should be: ten attempts are ten
-- rows, because how many there were is the fact worth reading.
CREATE FUNCTION "test"."TestLogLoginFailure_RecordsEveryAttemptRatherThanCollapsingThem" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    PERFORM "dbo"."LogLoginFailure"('subject-member', 'A login attempt was refused.', CURRENT_TIMESTAMP - interval '3 minutes');
    PERFORM "dbo"."LogLoginFailure"('subject-member', 'A login attempt was refused.', CURRENT_TIMESTAMP - interval '2 minutes');
    PERFORM "dbo"."LogLoginFailure"('subject-member', 'A login attempt was refused.', CURRENT_TIMESTAMP - interval '1 minute');

    SELECT count(*) INTO _Count
    FROM "dbo"."SecurityEvents"
    WHERE "SecurityEvents"."UserUUID" = "test"."Fixture"('User.Member')
        AND "SecurityEvents"."EventType" = 'LoginFailed';

    PERFORM "test"."AssertEquals"(_Count, 3::bigint, 'three attempts should be three rows');
END;
$$ LANGUAGE plpgsql;
