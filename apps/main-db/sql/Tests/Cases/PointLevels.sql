--
-- Levels are a definition table with no reader yet. What these lock in is the
-- shape a reader will depend on: levels are global, thresholds compare against
-- a dbo.UserTallies amount, and a name is only unique within a point type.
--

CREATE FUNCTION "test"."TestPointLevels_MatchLevelsAgainstATally" () RETURNS void AS $$
DECLARE
    _Reached text;
BEGIN
    SELECT string_agg("PointLevels"."Name", ', ' ORDER BY "PointLevels"."MinimumAmount") INTO _Reached
    FROM "dbo"."PointLevels"
        JOIN "dbo"."UserTallies" ON ("UserTallies"."PointUUID" = "PointLevels"."PointUUID")
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "PointLevels"."IsEnabled" = true
        AND "PointLevels"."MinimumAmount" <= "UserTallies"."Amount";

    PERFORM "test"."AssertEquals"(_Reached, 'Bronze', 'a tally of 12.5 reaches Bronze at 10 and not Silver at 50');
END;
$$ LANGUAGE plpgsql;

-- Two point types can both have a "Bronze"; one point type cannot have two.
CREATE FUNCTION "test"."TestPointLevels_AllowTheSameNameForAnotherPointType" () RETURNS void AS $$
BEGIN
    INSERT INTO "dbo"."PointLevels" ("PointUUID", "Name", "MinimumAmount", "CreatedBy")
    VALUES ("test"."Fixture"('Point.Gems'), 'Bronze', 5.0000, 'test');

    PERFORM "test"."AssertRowCount"(
        'SELECT 1 FROM "dbo"."PointLevels" WHERE "Name" = ''Bronze''',
        2,
        'Bronze should exist for both point types'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestPointLevels_RejectADuplicateNameWithinAPointType" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."PointLevels" ("PointUUID", "Name", "MinimumAmount", "CreatedBy") VALUES (%L, ''Bronze'', 99.0000, ''test'')',
            "test"."Fixture"('Point.Points')
        ),
        'PointLevels accepted two levels of the same name for one point type'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestPointLevels_RejectAnUnknownPointType" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        'INSERT INTO "dbo"."PointLevels" ("PointUUID", "Name", "MinimumAmount", "CreatedBy") VALUES (''00000000-0000-4000-8000-000000000000'', ''Orphan'', 1.0000, ''test'')',
        'PointLevels accepted a point type that does not exist'
    );
END;
$$ LANGUAGE plpgsql;
