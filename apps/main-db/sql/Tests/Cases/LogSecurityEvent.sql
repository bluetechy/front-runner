--
-- The one writer into the security log.
--

CREATE FUNCTION "test"."TestLogSecurityEvent_WritesAnUnansweredEventOntoTheAccount" () RETURNS void AS $$
DECLARE
    _SecurityEventUUID uuid;
    _Row record;
BEGIN
    _SecurityEventUUID := "dbo"."LogSecurityEvent"('member', 'EmailRemoved', 'work@example.test was removed.');

    SELECT * INTO _Row FROM "dbo"."SecurityEvents" WHERE "SecurityEventUUID" = _SecurityEventUUID;

    PERFORM "test"."AssertEquals"(_Row."UserUUID", "test"."Fixture"('User.Member'), 'the event should land on the account that was named');
    PERFORM "test"."AssertEquals"(_Row."Description", 'work@example.test was removed.', 'the sentence is the caller''s, not composed here');
    PERFORM "test"."AssertEquals"(_Row."ReviewedAt", NULL::TIMESTAMPTZ, 'a fresh event has not been answered');
    PERFORM "test"."AssertEquals"(_Row."CreatedBy", 'member', 'the login name that caused it is who wrote it');
END;
$$ LANGUAGE plpgsql;

-- A login knows these two and most other events know neither, so they are
-- optional arguments rather than a second function.
CREATE FUNCTION "test"."TestLogSecurityEvent_TakesADeviceAndAPlaceWhenThereIsOne" () RETURNS void AS $$
DECLARE
    _SecurityEventUUID uuid;
    _Row record;
BEGIN
    -- Written first and read second. Calling the writer inside the WHERE would
    -- run it against the snapshot the SELECT opened with, which is the moment
    -- before its own insert, and the row would not be found.
    _SecurityEventUUID := "dbo"."LogSecurityEvent"('member', 'LoginSucceeded', 'New login on Windows.', 'Windows', 'Utah, USA');

    SELECT * INTO _Row FROM "dbo"."SecurityEvents" WHERE "SecurityEventUUID" = _SecurityEventUUID;

    PERFORM "test"."AssertEquals"(_Row."Device", 'Windows'::varchar, 'the device should be kept');
    PERFORM "test"."AssertEquals"(_Row."Location", 'Utah, USA'::varchar, 'the place should be kept');
END;
$$ LANGUAGE plpgsql;

-- This is a log. It is called after the thing it records already happened, so
-- an unknown login writes nothing and says so rather than raising and undoing
-- the write it was describing.
CREATE FUNCTION "test"."TestLogSecurityEvent_AnswersAnUnknownLoginWithNothing" () RETURNS void AS $$
DECLARE
    _Before bigint;
    _After bigint;
BEGIN
    SELECT count(*) INTO _Before FROM "dbo"."SecurityEvents";

    PERFORM "test"."AssertEquals"(
        "dbo"."LogSecurityEvent"('nobody', 'LoginSucceeded', 'New login.'),
        NULL::uuid,
        'an unknown login should write no event'
    );

    SELECT count(*) INTO _After FROM "dbo"."SecurityEvents";
    PERFORM "test"."AssertEquals"(_After, _Before, 'and should leave the table as it found it');
END;
$$ LANGUAGE plpgsql;

-- It reaches the page it was written for, which is the whole point of writing
-- it: the reader and the writer agree about what a row is.
CREATE FUNCTION "test"."TestLogSecurityEvent_ShowsUpInTheAccountsList" () RETURNS void AS $$
DECLARE
    _Newest text;
BEGIN
    PERFORM "dbo"."LogSecurityEvent"('member', 'PasswordChanged', 'Your password was changed.');

    SELECT "Events"."EventType" INTO _Newest FROM "dbo"."GetSecurityEvents"('member', 1) AS "Events";

    PERFORM "test"."AssertEquals"(_Newest, 'PasswordChanged', 'the event just written should be the newest one in the list');
END;
$$ LANGUAGE plpgsql;

-- Everything but a login means "now". A login knows better, because it
-- happened when the identity provider says it did rather than when the first
-- request carrying that session arrived. See dbo.LogLoginEvent.
CREATE FUNCTION "test"."TestLogSecurityEvent_StampsAnEventNowUnlessToldOtherwise" () RETURNS void AS $$
DECLARE
    -- Recent and relative, never a fixed date: an event written beyond the
    -- twelve-month window is swept by its own insert. See
    -- dbo.trim_security_events.
    _Earlier TIMESTAMPTZ := CURRENT_TIMESTAMP - interval '2 hours';
    _SecurityEventUUID uuid;
    _Now TIMESTAMPTZ;
    _Then TIMESTAMPTZ;
BEGIN
    -- Written first and read second, for the reason the case above gives.
    _SecurityEventUUID := "dbo"."LogSecurityEvent"('member', 'EmailAdded', 'work@example.test was added.');
    SELECT "OccurredAt" INTO _Now FROM "dbo"."SecurityEvents" WHERE "SecurityEventUUID" = _SecurityEventUUID;

    PERFORM "test"."AssertEquals"(_Now, CURRENT_TIMESTAMP, 'an ordinary event happens when it is written');

    _SecurityEventUUID := "dbo"."LogSecurityEvent"('member', 'LoginSucceeded', 'New login.', NULL, NULL, _Earlier);
    SELECT "OccurredAt" INTO _Then FROM "dbo"."SecurityEvents" WHERE "SecurityEventUUID" = _SecurityEventUUID;

    PERFORM "test"."AssertEquals"(_Then, _Earlier, 'a caller that knows better is believed');
END;
$$ LANGUAGE plpgsql;
