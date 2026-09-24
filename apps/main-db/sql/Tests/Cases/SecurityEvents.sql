--
-- What the columns on the security log mean. The functions that read and write
-- it have their own files; this one is about the table itself.
--

-- The two review columns carry one fact between them, so the CHECK is what
-- stops them disagreeing: a row cannot say it was answered without saying what
-- the answer was, or the other way round.
CREATE FUNCTION "test"."TestSecurityEvents_RefusesHalfAnAnswer" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        $sql$UPDATE "dbo"."SecurityEvents" SET "ReviewedAt" = CURRENT_TIMESTAMP
             WHERE "SecurityEventUUID" = "test"."Fixture"('SecurityEvent.Login')$sql$,
        'a review time with no answer beside it should be refused'
    );

    PERFORM "test"."AssertRaises"(
        $sql$UPDATE "dbo"."SecurityEvents" SET "Recognized" = true
             WHERE "SecurityEventUUID" = "test"."Fixture"('SecurityEvent.Login')$sql$,
        'an answer with no review time beside it should be refused'
    );
END;
$$ LANGUAGE plpgsql;

-- Unanswered is both columns NULL, which is what puts the New mark on a row.
CREATE FUNCTION "test"."TestSecurityEvents_StartsUnanswered" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    SELECT * INTO _Row FROM "dbo"."SecurityEvents"
    WHERE "SecurityEventUUID" = "test"."Fixture"('SecurityEvent.Login');

    PERFORM "test"."AssertEquals"(_Row."ReviewedAt", NULL::TIMESTAMPTZ, 'a new event has not been reviewed');
    PERFORM "test"."AssertEquals"(_Row."Recognized", NULL::boolean, 'a new event carries no answer');
END;
$$ LANGUAGE plpgsql;

-- A login knows a device and a place; an email address being added knows
-- neither. Both columns are nullable for that reason, and the page leaves out
-- whichever is missing rather than printing "Unknown".
CREATE FUNCTION "test"."TestSecurityEvents_AcceptsAnEventWithNoDeviceOrLocation" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    SELECT * INTO _Row FROM "dbo"."SecurityEvents"
    WHERE "SecurityEventUUID" = "test"."Fixture"('SecurityEvent.EmailAdded');

    PERFORM "test"."AssertEquals"(_Row."Device", NULL::varchar, 'an email change has no device');
    PERFORM "test"."AssertEquals"(_Row."Location", NULL::varchar, 'an email change has no location');
END;
$$ LANGUAGE plpgsql;

-- The security log belongs to a person, not to a company. There is no
-- organization column to leave out: an account is one account however many
-- organizations it belongs to, and a login is not any of their business.
CREATE FUNCTION "test"."TestSecurityEvents_HasNoOrganization" () RETURNS void AS $$
DECLARE
    _Found bigint;
BEGIN
    SELECT count(*) INTO _Found FROM information_schema.columns
    WHERE "table_schema" = 'dbo' AND "table_name" = 'SecurityEvents' AND "column_name" = 'OrganizationUUID';

    PERFORM "test"."AssertEquals"(_Found, 0::bigint, 'a security event should belong to an account and to nothing else');
END;
$$ LANGUAGE plpgsql;
