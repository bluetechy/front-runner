--
-- The security page's RECENT ACTIVITY list: one account's own events, newest
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

-- The cap is how "recent" is defined: this list is not paged, so main-api asks
-- for the latest handful and the page shows all of it.
CREATE FUNCTION "test"."TestGetSecurityEvents_CapsTheListWhenAskedTo" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRowCount"(
        $sql$SELECT * FROM "dbo"."GetSecurityEvents"('member', 2)$sql$,
        2,
        'a row limit should cap the list'
    );

    PERFORM "test"."AssertRowCount"(
        $sql$SELECT * FROM "dbo"."GetSecurityEvents"('member', 0)$sql$,
        3,
        'nought means every row, the way the point readers take it'
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
