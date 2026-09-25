--
-- Answering "do you recognize this activity?".
--

CREATE FUNCTION "test"."TestReviewSecurityEvent_RecordsThatItWasRecognized" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    PERFORM "dbo"."ReviewSecurityEvent"('member', "test"."Fixture"('SecurityEvent.Login'), true);

    SELECT * INTO _Row FROM "dbo"."SecurityEvents"
    WHERE "SecurityEventUUID" = "test"."Fixture"('SecurityEvent.Login');

    PERFORM "test"."AssertTrue"(_Row."Recognized", 'the answer should be kept');
    PERFORM "test"."AssertTrue"(_Row."ReviewedAt" IS NOT NULL, 'and the moment it was given');
    PERFORM "test"."AssertEquals"(_Row."UpdatedBy", 'member', 'by whoever gave it');
END;
$$ LANGUAGE plpgsql;

-- Saying no is also saying something happened. A security log that does not
-- hold the moment somebody raised the alarm is missing the row an
-- investigation starts from.
CREATE FUNCTION "test"."TestReviewSecurityEvent_LogsThatActivityWasReported" () RETURNS void AS $$
DECLARE
    _Reported record;
BEGIN
    PERFORM "dbo"."ReviewSecurityEvent"('member', "test"."Fixture"('SecurityEvent.Login'), false);

    SELECT * INTO _Reported FROM "dbo"."SecurityEvents"
    WHERE "UserUUID" = "test"."Fixture"('User.Member') AND "EventType" = 'ActivityReported';

    PERFORM "test"."AssertTrue"(_Reported."SecurityEventUUID" IS NOT NULL, 'reporting activity should itself be logged');
    PERFORM "test"."AssertTrue"(_Reported."Description" LIKE '%New login on Mac OS.%', 'and should say which activity it was about');
    -- Nothing to ask somebody about a thing they just did, so the row arrives
    -- answered rather than wearing a New mark of its own.
    PERFORM "test"."AssertTrue"(_Reported."Recognized", 'the report is an act of its own and is not in question');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestReviewSecurityEvent_LogsNothingExtraWhenItWasRecognized" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."ReviewSecurityEvent"('member', "test"."Fixture"('SecurityEvent.Login'), true);

    PERFORM "test"."AssertRowCount"(
        $sql$SELECT * FROM "dbo"."SecurityEvents" WHERE "EventType" = 'ActivityReported'$sql$,
        0,
        '"yes, it was me" is not an incident'
    );
END;
$$ LANGUAGE plpgsql;

-- The answer can be changed, which is the opposite of dbo.MarkNotificationRead
-- refusing to move "ReadAt" on a second read. Being seen twice is still being
-- seen once; being answered twice is a different answer, and on a security page
-- the direction that matters is somebody thinking again about a "yes".
CREATE FUNCTION "test"."TestReviewSecurityEvent_TakesASecondAnswer" () RETURNS void AS $$
DECLARE
    _Recognized boolean;
BEGIN
    PERFORM "dbo"."ReviewSecurityEvent"('member', "test"."Fixture"('SecurityEvent.Login'), true);
    PERFORM "dbo"."ReviewSecurityEvent"('member', "test"."Fixture"('SecurityEvent.Login'), false);

    SELECT "Recognized" INTO _Recognized FROM "dbo"."SecurityEvents"
    WHERE "SecurityEventUUID" = "test"."Fixture"('SecurityEvent.Login');

    PERFORM "test"."AssertFalse"(_Recognized, 'the later answer is the answer');
END;
$$ LANGUAGE plpgsql;

-- The whole list back, the way the email address writers on the same page
-- answer, because the browser holds this whole window and pages it itself.
CREATE FUNCTION "test"."TestReviewSecurityEvent_AnswersWithTheList" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRowCount"(
        format($sql$SELECT * FROM "dbo"."ReviewSecurityEvent"('member', %L, true)$sql$, "test"."Fixture"('SecurityEvent.Login')),
        3,
        'the caller should be handed the list it is showing'
    );
END;
$$ LANGUAGE plpgsql;

-- And no more of it than was asked for: a mutation that answered with a longer
-- list than the query did would grow the table under somebody who pressed a
-- button in it.
CREATE FUNCTION "test"."TestReviewSecurityEvent_KeepsTheWindowItWasGiven" () RETURNS void AS $$
BEGIN
    INSERT INTO "dbo"."SecurityEvents" ("UserUUID", "EventType", "Description", "OccurredAt", "CreatedBy")
    VALUES ("test"."Fixture"('User.Member'), 'LoginSucceeded', 'New login on a laptop last seen in July.', CURRENT_TIMESTAMP - interval '40 days', 'tests');

    PERFORM "test"."AssertRowCount"(
        format($sql$SELECT * FROM "dbo"."ReviewSecurityEvent"('member', %L, true, 30)$sql$, "test"."Fixture"('SecurityEvent.Login')),
        3,
        'the window should reach the reader, so the forty-day-old event stays out of the answer'
    );
END;
$$ LANGUAGE plpgsql;

-- Somebody else's event is refused with the schema's authorization message
-- rather than a "no such event", which would confirm that it exists.
CREATE FUNCTION "test"."TestReviewSecurityEvent_RefusesSomebodyElsesEvent" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format($sql$SELECT * FROM "dbo"."ReviewSecurityEvent"('member', %L, true)$sql$, "test"."Fixture"('SecurityEvent.OwnerLogin')),
        'answering for another account should be refused',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestReviewSecurityEvent_RefusesAnUnknownLogin" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format($sql$SELECT * FROM "dbo"."ReviewSecurityEvent"('nobody', %L, true)$sql$, "test"."Fixture"('SecurityEvent.Login')),
        'an unknown login should be refused',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

-- There is no third answer. A NULL would leave a row claiming to have been
-- reviewed with nothing said, which the table's own CHECK would refuse a
-- moment later and less clearly.
CREATE FUNCTION "test"."TestReviewSecurityEvent_RefusesAnEmptyAnswer" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format($sql$SELECT * FROM "dbo"."ReviewSecurityEvent"('member', %L, NULL)$sql$, "test"."Fixture"('SecurityEvent.Login')),
        'an answer is not optional',
        'An answer is required.'
    );
END;
$$ LANGUAGE plpgsql;
