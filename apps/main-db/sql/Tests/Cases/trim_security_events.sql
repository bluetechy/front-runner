--
-- The retention rule on the security log, which is a trigger rather than
-- something each writer remembers to do.
--
-- Twelve months is written in dbo.trim_security_events and repeated in the
-- privacy policy's "How long we keep it". These tests are the third place, and
-- deliberately so: a change to the number should have to be made here too,
-- where the comment says to go and change the policy.
--
-- Every case here **ages a row with an UPDATE rather than inserting it old**.
-- An insert fires this trigger, and a row written with a date already beyond
-- the window is swept by its own insert -- correct, and useless as a fixture
-- for proving that a later write is what sweeps it. An UPDATE fires nothing.
--

/* A row on the member's log, moved back to whatever age a case needs. */
CREATE FUNCTION "test"."AgedSecurityEvent" (_Age interval) RETURNS uuid AS $$
    DECLARE
        _SecurityEventUUID uuid;
    BEGIN
        INSERT INTO "dbo"."SecurityEvents" ("UserUUID", "EventType", "Description", "CreatedBy")
        VALUES ("test"."Fixture"('User.Member'), 'LoginSucceeded', 'A login worth keeping or not.', 'fixtures')
        RETURNING "SecurityEventUUID" INTO _SecurityEventUUID;

        UPDATE "dbo"."SecurityEvents" SET "OccurredAt" = CURRENT_TIMESTAMP - _Age
        WHERE "SecurityEvents"."SecurityEventUUID" = _SecurityEventUUID;

        RETURN _SecurityEventUUID;
    END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestTrimSecurityEvents_DropsAnAccountsEventsOlderThanTwelveMonths" () RETURNS void AS $$
DECLARE
    _Stale uuid;
BEGIN
    _Stale := "test"."AgedSecurityEvent"(interval '13 months');

    -- The write that sweeps. Nothing schedules this: an account's own events
    -- take its old ones with them.
    PERFORM "dbo"."LogSecurityEvent"('member', 'PasswordChanged', 'Your password was changed.');

    PERFORM "test"."AssertRowCount"(
        format($sql$SELECT 1 FROM "dbo"."SecurityEvents" WHERE "SecurityEventUUID" = %L$sql$, _Stale),
        0,
        'an event older than twelve months should not survive the next one'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestTrimSecurityEvents_KeepsWhatIsStillInsideTheWindow" () RETURNS void AS $$
DECLARE
    _Recent uuid;
BEGIN
    _Recent := "test"."AgedSecurityEvent"(interval '11 months');

    PERFORM "dbo"."LogSecurityEvent"('member', 'PasswordChanged', 'Your password was changed.');

    PERFORM "test"."AssertRowCount"(
        format($sql$SELECT 1 FROM "dbo"."SecurityEvents" WHERE "SecurityEventUUID" = %L$sql$, _Recent),
        1,
        'eleven months is inside the window'
    );
END;
$$ LANGUAGE plpgsql;

-- An event that is already beyond the window when it is written is swept by
-- its own insert. That is the rule applied consistently rather than a special
-- case, and it is worth pinning: it is why nothing in this schema can seed a
-- security log going back years.
CREATE FUNCTION "test"."TestTrimSecurityEvents_SweepsAnEventWrittenAlreadyExpired" () RETURNS void AS $$
DECLARE
    _Stale uuid;
BEGIN
    INSERT INTO "dbo"."SecurityEvents" ("UserUUID", "EventType", "Description", "OccurredAt", "CreatedBy")
    VALUES ("test"."Fixture"('User.Member'), 'LoginSucceeded', 'A login from long ago.',
            CURRENT_TIMESTAMP - interval '13 months', 'fixtures')
    RETURNING "SecurityEventUUID" INTO _Stale;

    PERFORM "test"."AssertRowCount"(
        format($sql$SELECT 1 FROM "dbo"."SecurityEvents" WHERE "SecurityEventUUID" = %L$sql$, _Stale),
        0,
        'a row written beyond the window does not get to stay because it was new'
    );
END;
$$ LANGUAGE plpgsql;

-- One person's login must not be the thing that erases another's history, and
-- a trigger that swept the whole table would scan it on every insert.
CREATE FUNCTION "test"."TestTrimSecurityEvents_LeavesOtherAccountsAlone" () RETURNS void AS $$
DECLARE
    _TheirStale uuid;
BEGIN
    INSERT INTO "dbo"."SecurityEvents" ("UserUUID", "EventType", "Description", "CreatedBy")
    VALUES ("test"."Fixture"('User.Owner'), 'LoginSucceeded', 'An old login of the owner''s.', 'fixtures')
    RETURNING "SecurityEventUUID" INTO _TheirStale;

    UPDATE "dbo"."SecurityEvents" SET "OccurredAt" = CURRENT_TIMESTAMP - interval '13 months'
    WHERE "SecurityEvents"."SecurityEventUUID" = _TheirStale;

    PERFORM "dbo"."LogSecurityEvent"('member', 'PasswordChanged', 'Your password was changed.');

    PERFORM "test"."AssertRowCount"(
        format($sql$SELECT 1 FROM "dbo"."SecurityEvents" WHERE "SecurityEventUUID" = %L$sql$, _TheirStale),
        1,
        'the member''s event should not sweep the owner''s'
    );
END;
$$ LANGUAGE plpgsql;

-- Every writer, not just the ordinary one, which is the whole reason this is a
-- trigger: reporting activity logs a row of its own.
CREATE FUNCTION "test"."TestTrimSecurityEvents_SweepsOnEveryWriterNotJustTheLogger" () RETURNS void AS $$
DECLARE
    _Stale uuid;
BEGIN
    _Stale := "test"."AgedSecurityEvent"(interval '13 months');

    PERFORM "dbo"."ReviewSecurityEvent"('member', "test"."Fixture"('SecurityEvent.Login'), false);

    PERFORM "test"."AssertRowCount"(
        format($sql$SELECT 1 FROM "dbo"."SecurityEvents" WHERE "SecurityEventUUID" = %L$sql$, _Stale),
        0,
        'reporting activity writes an event, so it sweeps like any other write'
    );
END;
$$ LANGUAGE plpgsql;
