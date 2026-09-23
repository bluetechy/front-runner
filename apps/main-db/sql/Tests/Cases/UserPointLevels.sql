--
-- Reaching a level is recorded once and kept. The table holds history rather
-- than a current-level pointer, so a balance falling back below the threshold
-- does not erase the row -- that is the behavior these pin down.
--

CREATE FUNCTION "test"."TestUserPointLevels_RecordWhenALevelWasReached" () RETURNS void AS $$
DECLARE
    _ReachedAt timestamptz;
BEGIN
    SELECT "ReachedAt" INTO _ReachedAt FROM "dbo"."UserPointLevels"
    WHERE "UserUUID" = "test"."Fixture"('User.Member')
        AND "OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "PointLevelUUID" = "test"."Fixture"('PointLevel.Bronze');

    PERFORM "test"."AssertEquals"(_ReachedAt, '2024-01-01 00:00:00+00'::timestamptz, 'the member should be recorded as reaching Bronze');
END;
$$ LANGUAGE plpgsql;

-- Dropping back below the threshold is a balance change, not a level change.
CREATE FUNCTION "test"."TestUserPointLevels_SurviveTheBalanceFallingBack" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    INSERT INTO "dbo"."UserPoints" ("UserUUID", "OrganizationUUID", "PointUUID", "Description", "Amount", "CreatedBy")
    VALUES ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 'Spent it all', -12.5000, 'test');

    SELECT count(*) INTO _Count FROM "dbo"."UserPointLevels"
    WHERE "UserUUID" = "test"."Fixture"('User.Member')
        AND "PointLevelUUID" = "test"."Fixture"('PointLevel.Bronze');
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'the Bronze row should outlive the balance that earned it');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestUserPointLevels_RejectReachingTheSameLevelTwice" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."UserPointLevels" ("UserUUID", "OrganizationUUID", "PointLevelUUID", "CreatedBy") VALUES (%L, %L, %L, ''test'')',
            "test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('PointLevel.Bronze')
        ),
        'UserPointLevels accepted the same level twice for one user'
    );
END;
$$ LANGUAGE plpgsql;

-- The same level in a different organization is a different row: levels are
-- global, but holding one is scoped like every other per-user table here.
CREATE FUNCTION "test"."TestUserPointLevels_AreScopedByOrganization" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    INSERT INTO "dbo"."UserPointLevels" ("UserUUID", "OrganizationUUID", "PointLevelUUID", "CreatedBy")
    VALUES ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Disabled'), "test"."Fixture"('PointLevel.Bronze'), 'test');

    SELECT count(*) INTO _Count FROM "dbo"."UserPointLevels"
    WHERE "UserUUID" = "test"."Fixture"('User.Member')
        AND "PointLevelUUID" = "test"."Fixture"('PointLevel.Bronze');
    PERFORM "test"."AssertEquals"(_Count, 2::bigint, 'the same level in another organization should be its own row');
END;
$$ LANGUAGE plpgsql;
