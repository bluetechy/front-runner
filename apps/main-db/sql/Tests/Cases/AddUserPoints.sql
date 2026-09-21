--
-- The member's Points balance starts at 12.5 and the owner owns Acme.
--

CREATE FUNCTION "test"."TestAddUserPoints_WritesOneLedgerRowAndLetsTheTriggerDoTheRest" () RETURNS void AS $$
DECLARE
    _UUID uuid;
    _Amount decimal(19,4);
BEGIN
    _UUID := "dbo"."AddUserPoints"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'),
                                   "test"."Fixture"('Point.Points'), 5.0000, 'Well done');

    PERFORM "test"."AssertRowCount"(format('SELECT 1 FROM "dbo"."UserPoints" WHERE "UserPointUUID" = %L', _UUID), 1,
        'the ledger row should exist');

    SELECT "Amount" INTO _Amount FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');
    PERFORM "test"."AssertEquals"(_Amount, 17.5000::decimal(19,4), '12.5 plus 5 -- calculate_tallies did it, nothing wrote the tally by hand');
END;
$$ LANGUAGE plpgsql;

-- The drafts had three procedures for this; the sign is the only difference.
CREATE FUNCTION "test"."TestAddUserPoints_TakesAwayOnANegativeAmount" () RETURNS void AS $$
DECLARE
    _Amount decimal(19,4);
BEGIN
    PERFORM "dbo"."AddUserPoints"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'),
                                  "test"."Fixture"('Point.Points'), -2.5000, 'Clawback', 'Revoked');

    SELECT "Amount" INTO _Amount FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');
    PERFORM "test"."AssertEquals"(_Amount, 10.0000::decimal(19,4), '12.5 less 2.5');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAddUserPoints_RejectsANonOwner" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."AddUserPoints"(''member'', %L, %L, %L, 5.0000, ''Self-award'')',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'), "test"."Fixture"('Point.Points')),
        'a plain member granted themselves points'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAddUserPoints_RejectsZero" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."AddUserPoints"(''owner'', %L, %L, %L, 0, ''Nothing'')',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'), "test"."Fixture"('Point.Points')),
        'a zero-amount ledger row is noise'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAddUserPoints_RejectsAUserOutsideTheOrganization" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."AddUserPoints"(''owner'', %L, %L, %L, 5.0000, ''Stranger'')',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Outsider'), "test"."Fixture"('Point.Points')),
        'points were granted to somebody outside the organization'
    );
END;
$$ LANGUAGE plpgsql;

-- Double Points is open in the fixtures, so the flag doubles the award. It is
-- opt-in: the default run must store exactly what was asked for.
CREATE FUNCTION "test"."TestAddUserPoints_AppliesTheMultiplierOnlyWhenAsked" () RETURNS void AS $$
DECLARE
    _Plain uuid;
    _Boosted uuid;
    _PlainAmount decimal(19,4);
    _BoostedAmount decimal(19,4);
BEGIN
    _Plain := "dbo"."AddUserPoints"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'),
                                    "test"."Fixture"('Point.Points'), 5.0000, 'Plain');
    _Boosted := "dbo"."AddUserPoints"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'),
                                      "test"."Fixture"('Point.Points'), 5.0000, 'Boosted', NULL, NULL, NULL, true);

    SELECT "Amount" INTO _PlainAmount FROM "dbo"."UserPoints" WHERE "UserPointUUID" = _Plain;
    SELECT "Amount" INTO _BoostedAmount FROM "dbo"."UserPoints" WHERE "UserPointUUID" = _Boosted;

    PERFORM "test"."AssertEquals"(_PlainAmount, 5.0000::decimal(19,4), 'no multiplier unless asked');
    PERFORM "test"."AssertEquals"(_BoostedAmount, 10.0000::decimal(19,4), 'Double Points is open, so the award doubles');
END;
$$ LANGUAGE plpgsql;

-- ApplyPointMultiplier multiplied the whole balance. This is the test that
-- says it must not: the earlier rows are untouched.
CREATE FUNCTION "test"."TestAddUserPoints_MultiplierDoesNotTouchEarlierRows" () RETURNS void AS $$
DECLARE
    _Amount decimal(19,4);
BEGIN
    PERFORM "dbo"."AddUserPoints"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'),
                                  "test"."Fixture"('Point.Points'), 5.0000, 'Boosted', NULL, NULL, NULL, true);

    SELECT "Amount" INTO _Amount FROM "dbo"."UserPoints"
    WHERE "UserPointUUID" = "test"."Fixture"('UserPoint.MemberActive');
    PERFORM "test"."AssertEquals"(_Amount, 10.0000::decimal(19,4), 'a multiplier scales the new award, never the history');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPointMultiplier_ReturnsOneWhenNothingIsOpen" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertEquals"(
        "dbo"."GetPointMultiplier"('member', "test"."Fixture"('Organization.Acme'), '2018-06-01 00:00:00+00'::timestamptz),
        1.0000::decimal(19,4), 'both fixture windows start in 2019 or later, so 2018 has no multiplier and the factor is a harmless 1');
    PERFORM "test"."AssertEquals"(
        "dbo"."GetPointMultiplier"('member', "test"."Fixture"('Organization.Acme')),
        2.0000::decimal(19,4), 'Double Points is open now');
END;
$$ LANGUAGE plpgsql;

-- The fixture windows do not overlap -- Launch Week closed as Double Points
-- opened -- so a third has to be opened to test the tie-break.
CREATE FUNCTION "test"."TestGetPointMultiplier_TakesTheLargestWhenTwoOverlap" () RETURNS void AS $$
BEGIN
    INSERT INTO "dbo"."PointMultipliers" ("Name", "Factor", "StartsAt", "EndsAt", "CreatedBy")
    VALUES ('Triple', 3.0000, now() - interval '1 day', now() + interval '1 day', 'test');

    PERFORM "test"."AssertEquals"(
        "dbo"."GetPointMultiplier"('member', "test"."Fixture"('Organization.Acme')),
        3.0000::decimal(19,4), 'with 2x and 3x both open the larger wins');
END;
$$ LANGUAGE plpgsql;
