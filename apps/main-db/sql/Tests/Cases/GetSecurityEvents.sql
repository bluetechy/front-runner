--
-- The security page's RECENT ACTIVITY LOG list: one account's own events, newest
-- first.
--

CREATE FUNCTION "test"."TestGetSecurityEvents_ReturnsTheAccountsOwnEventsNewestFirst" () RETURNS void AS $$
DECLARE
    _Types text;
BEGIN
    SELECT string_agg("Events"."EventType", ', ') INTO _Types
    FROM "dbo"."GetSecurityEvents"('member') AS "Events";

    PERFORM "test"."AssertEquals"(_Types, 'LoginSucceeded, EmailAdded, PrimaryEmailChanged', 'the newest event should come first');
END;
$$ LANGUAGE plpgsql;

-- Somebody else's log is somebody else's. The owner's login sits between two
-- of the member's in time, so a function that forgot the WHERE would be caught
-- by the order as well as by the count.
CREATE FUNCTION "test"."TestGetSecurityEvents_ShowsNobodyElsesLog" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRowCount"(
        $sql$SELECT * FROM "dbo"."GetSecurityEvents"('member')$sql$,
        3,
        'the member has three security events and the owner''s is not one of them'
    );

    PERFORM "test"."AssertRowCount"(
        $sql$SELECT * FROM "dbo"."GetSecurityEvents"('owner')$sql$,
        1,
        'the owner has one'
    );
END;
$$ LANGUAGE plpgsql;

-- The review columns come back as they stand rather than as a flag made out of
-- them: the page draws the New mark from "ReviewedAt" being NULL and shows
-- what was said from "Recognized".
CREATE FUNCTION "test"."TestGetSecurityEvents_CarriesTheReviewAsItStands" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    SELECT * INTO _Row FROM "dbo"."GetSecurityEvents"('member') AS "Events"
    WHERE "Events"."SecurityEventUUID" = "test"."Fixture"('SecurityEvent.Recognized');

    PERFORM "test"."AssertTrue"(_Row."Recognized", 'an answered event says what was answered');
    PERFORM "test"."AssertTrue"(_Row."ReviewedAt" IS NOT NULL, 'an answered event says when');

    SELECT * INTO _Row FROM "dbo"."GetSecurityEvents"('member') AS "Events"
    WHERE "Events"."SecurityEventUUID" = "test"."Fixture"('SecurityEvent.Login');

    PERFORM "test"."AssertEquals"(_Row."ReviewedAt", NULL::TIMESTAMPTZ, 'an unanswered event is what the New mark is drawn from');
END;
$$ LANGUAGE plpgsql;

-- The window is how "recent" is defined: main-api asks for thirty days, the
-- page says so in the sentence above the table, and it pages what comes back.
-- The number on the page is only true if this leaves out what is older.
--
-- The old event is written here rather than put in the fixtures, because every
-- other case in this file counts the member's rows and a fourth one would
-- change all of them. Each test runs in its own transaction and is rolled back.
CREATE FUNCTION "test"."TestGetSecurityEvents_LeavesOutWhatIsOlderThanTheWindow" () RETURNS void AS $$
BEGIN
    INSERT INTO "dbo"."SecurityEvents" ("UserUUID", "EventType", "Description", "OccurredAt", "CreatedBy")
    VALUES ("test"."Fixture"('User.Member'), 'LoginSucceeded', 'New login on a laptop last seen in July.', CURRENT_TIMESTAMP - interval '40 days', 'tests');

    PERFORM "test"."AssertRowCount"(
        $sql$SELECT * FROM "dbo"."GetSecurityEvents"('member', 30)$sql$,
        3,
        'an event from forty days ago is not part of the last thirty days'
    );

    PERFORM "test"."AssertRowCount"(
        $sql$SELECT * FROM "dbo"."GetSecurityEvents"('member', 0)$sql$,
        4,
        'nought means every row, the way the point readers take their cap'
    );

    PERFORM "test"."AssertRowCount"(
        $sql$SELECT * FROM "dbo"."GetSecurityEvents"('member')$sql$,
        4,
        'and so does leaving the window out altogether'
    );
END;
$$ LANGUAGE plpgsql;

-- An unknown login has an empty log rather than an error, the way it has an
-- empty wallet. There is nothing secret in "nothing has happened to you".
CREATE FUNCTION "test"."TestGetSecurityEvents_AnswersAnUnknownLoginWithNothing" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRowCount"(
        $sql$SELECT * FROM "dbo"."GetSecurityEvents"('nobody')$sql$,
        0,
        'an unknown login should have an empty log rather than an error'
    );
END;
$$ LANGUAGE plpgsql;
