--
-- A multiplier is a window with a factor and nothing more. Nothing applies it:
-- dbo.calculate_tallies sums the amounts already written to dbo.UserPoints, so
-- whatever awards the points has to do the multiplying first. These tests say
-- what selecting the applicable multiplier looks like, and prove the tally
-- ignores it.
--

CREATE FUNCTION "test"."TestPointMultipliers_SelectTheOneInItsWindow" () RETURNS void AS $$
DECLARE
    _Name varchar(64);
BEGIN
    SELECT "Name" INTO _Name FROM "dbo"."PointMultipliers"
    WHERE "IsEnabled" = true
        AND ("StartsAt" IS NULL OR "StartsAt" <= now())
        AND ("EndsAt" IS NULL OR "EndsAt" >= now());

    PERFORM "test"."AssertEquals"(_Name::text, 'Double Points', 'only the open multiplier window should match');
END;
$$ LANGUAGE plpgsql;

-- The trap this guards: a multiplier exists, so a reader assumes points were
-- doubled. They were not -- the amount on the UserPoints row is the amount.
CREATE FUNCTION "test"."TestPointMultipliers_DoNotChangeATally" () RETURNS void AS $$
DECLARE
    _Amount decimal(19,4);
BEGIN
    INSERT INTO "dbo"."UserPoints" ("UserUUID", "OrganizationUUID", "PointUUID", "Description", "Amount", "CreatedBy")
    VALUES ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 'Awarded during the double window', 2.0000, 'test');

    SELECT "Amount" INTO _Amount FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');

    PERFORM "test"."AssertEquals"(_Amount, 14.5000::decimal(19,4), '12.5 plus 2 is 14.5 -- the multiplier is not applied anywhere');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestPointMultipliers_DefaultToEnabled" () RETURNS void AS $$
DECLARE
    _IsEnabled boolean;
BEGIN
    INSERT INTO "dbo"."PointMultipliers" ("Name", "Factor", "CreatedBy") VALUES ('Quiet', 1.5000, 'test');
    SELECT "IsEnabled" INTO _IsEnabled FROM "dbo"."PointMultipliers" WHERE "Name" = 'Quiet';
    PERFORM "test"."AssertTrue"(_IsEnabled, 'a new multiplier should be enabled');
END;
$$ LANGUAGE plpgsql;
