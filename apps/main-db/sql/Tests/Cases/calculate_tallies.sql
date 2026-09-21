--
-- calculate_tallies runs from the UserPoints_UserTallies triggers, so every
-- test here drives it by writing to dbo.UserPoints rather than calling it.
--

CREATE FUNCTION "test"."TestCalculateTallies_SumsOnlyUnexpiredRows" () RETURNS void AS $$
DECLARE
    _Amount decimal(19,4);
BEGIN
    SELECT "UserTallies"."Amount" INTO _Amount FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');
    PERFORM "test"."AssertEquals"(_Amount, 12.5000::decimal(19,4), 'the tally should be 10 + 2.5, with the row that expired in 2020 left out');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestCalculateTallies_CreatesATallyOnTheFirstPointRow" () RETURNS void AS $$
DECLARE
    _Amount decimal(19,4);
BEGIN
    INSERT INTO "dbo"."UserPoints" ("UserUUID", "OrganizationUUID", "PointUUID", "Description", "Amount", "CreatedBy")
    VALUES ("test"."Fixture"('User.Owner'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Gems'), 'First gems', 4.0000, 'test');

    SELECT "UserTallies"."Amount" INTO _Amount FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Owner')
        AND "UserTallies"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Gems');
    PERFORM "test"."AssertEquals"(_Amount, 4.0000::decimal(19,4), 'no tally row was created for a new user/point pairing');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestCalculateTallies_AddsToAnExistingTally" () RETURNS void AS $$
DECLARE
    _Amount decimal(19,4);
BEGIN
    INSERT INTO "dbo"."UserPoints" ("UserUUID", "OrganizationUUID", "PointUUID", "Description", "Amount", "CreatedBy")
    VALUES ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 'Bonus', 1.5000, 'test');

    SELECT "UserTallies"."Amount" INTO _Amount FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');
    PERFORM "test"."AssertEquals"(_Amount, 14.0000::decimal(19,4), '12.5 plus a 1.5 bonus should be 14');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestCalculateTallies_RecalculatesWhenAPointRowChanges" () RETURNS void AS $$
DECLARE
    _Amount decimal(19,4);
BEGIN
    UPDATE "dbo"."UserPoints" SET "Amount" = 20.0000, "UpdatedBy" = 'test'
    WHERE "UserPointUUID" = "test"."Fixture"('UserPoint.MemberActive');

    SELECT "UserTallies"."Amount" INTO _Amount FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');
    PERFORM "test"."AssertEquals"(_Amount, 22.5000::decimal(19,4), 'the tally did not follow the point row from 10 up to 20');
END;
$$ LANGUAGE plpgsql;

-- Regression test: the UPDATE inside calculate_tallies once had no WHERE
-- clause, so a single point row rewrote every tally in the table with that
-- one user's balance.
CREATE FUNCTION "test"."TestCalculateTallies_OnlyTouchesTheAffectedTally" () RETURNS void AS $$
DECLARE
    _MemberPoints decimal(19,4);
    _MemberGems decimal(19,4);
BEGIN
    INSERT INTO "dbo"."UserPoints" ("UserUUID", "OrganizationUUID", "PointUUID", "Description", "Amount", "CreatedBy")
    VALUES ("test"."Fixture"('User.Owner'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 'More points', 500.0000, 'test');

    SELECT "UserTallies"."Amount" INTO _MemberPoints FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');
    SELECT "UserTallies"."Amount" INTO _MemberGems FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Gems');

    PERFORM "test"."AssertEquals"(_MemberPoints, 12.5000::decimal(19,4), 'another user''s point row changed this user''s tally');
    PERFORM "test"."AssertEquals"(_MemberGems, 3.0000::decimal(19,4), 'a points row changed the gems tally');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestCalculateTallies_KeepsOneTallyPerUserOrganizationAndPointType" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    INSERT INTO "dbo"."UserPoints" ("UserUUID", "OrganizationUUID", "PointUUID", "Description", "Amount", "CreatedBy")
    VALUES ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 'Another row', 1.0000, 'test');

    SELECT count(*) INTO _Count FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'a second point row created a second tally row');
END;
$$ LANGUAGE plpgsql;

-- DailyLimit and SpendLimit are policy someone set, sitting on a table that is
-- otherwise derived. calculate_tallies rewrites "Amount" on every point row
-- and upserts with DO NOTHING, so the limits have to survive that.
CREATE FUNCTION "test"."TestCalculateTallies_PreservesTheLimitsOnATally" () RETURNS void AS $$
DECLARE
    _DailyLimit decimal(19,4);
    _SpendLimit decimal(19,4);
    _Amount decimal(19,4);
BEGIN
    UPDATE "dbo"."UserTallies" SET "DailyLimit" = 50.0000, "SpendLimit" = 25.0000, "UpdatedBy" = 'test'
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');

    INSERT INTO "dbo"."UserPoints" ("UserUUID", "OrganizationUUID", "PointUUID", "Description", "Amount", "CreatedBy")
    VALUES ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 'Bonus', 1.5000, 'test');

    SELECT "UserTallies"."DailyLimit", "UserTallies"."SpendLimit", "UserTallies"."Amount"
    INTO _DailyLimit, _SpendLimit, _Amount
    FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');

    PERFORM "test"."AssertEquals"(_DailyLimit, 50.0000::decimal(19,4), 'calculate_tallies cleared DailyLimit');
    PERFORM "test"."AssertEquals"(_SpendLimit, 25.0000::decimal(19,4), 'calculate_tallies cleared SpendLimit');
    PERFORM "test"."AssertEquals"(_Amount, 14.0000::decimal(19,4), 'the tally should still have been recalculated');
END;
$$ LANGUAGE plpgsql;
