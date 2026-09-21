--
-- The draft inserted a bare UserBadges row. In this schema that means a NULL
-- EarnedAt, which is a badge in *progress* -- so the award would not have
-- counted as held by any reader.
--

CREATE FUNCTION "test"."TestAwardBadgeToUser_MakesTheBadgeShowUpAsHeld" () RETURNS void AS $$
DECLARE
    _Names text;
BEGIN
    PERFORM "dbo"."AwardBadgeToUser"('owner', "test"."Fixture"('Organization.Acme'),
                                     "test"."Fixture"('User.Owner'), "test"."Fixture"('Badge.Rookie'), 'Well earned');

    SELECT string_agg("Name", ', ' ORDER BY "Name") INTO _Names
    FROM "dbo"."GetBadges"('owner', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Names, 'Rare Find, Rookie, Seasonal', 'the awarded badge should read as held straight away');
END;
$$ LANGUAGE plpgsql;

-- Awarding a badge somebody was working towards completes it rather than
-- failing on the unique key.
CREATE FUNCTION "test"."TestAwardBadgeToUser_CompletesABadgeAlreadyInProgress" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    PERFORM "dbo"."AwardBadgeToUser"('owner', "test"."Fixture"('Organization.Acme'),
                                     "test"."Fixture"('User.Member'), "test"."Fixture"('Badge.InProgress'), 'Close enough');

    SELECT * INTO _Row FROM "dbo"."UserBadges"
    WHERE "UserUUID" = "test"."Fixture"('User.Member')
        AND "OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "BadgeUUID" = "test"."Fixture"('Badge.InProgress');

    PERFORM "test"."AssertTrue"(_Row."EarnedAt" IS NOT NULL, 'the in-progress row should now be earned');
    PERFORM "test"."AssertEquals"(_Row."ProgressCurrent", 4, 'and the progress it had is left alone');
END;
$$ LANGUAGE plpgsql;

-- Re-awarding a revoked badge gives it back.
CREATE FUNCTION "test"."TestAwardBadgeToUser_ClearsAPreviousRevocation" () RETURNS void AS $$
DECLARE
    _RevokedAt timestamptz;
BEGIN
    PERFORM "dbo"."AwardBadgeToUser"('owner', "test"."Fixture"('Organization.Acme'),
                                     "test"."Fixture"('User.Member'), "test"."Fixture"('Badge.Revoked'), 'Given back');

    SELECT "RevokedAt" INTO _RevokedAt FROM "dbo"."UserBadges"
    WHERE "UserUUID" = "test"."Fixture"('User.Member')
        AND "OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "BadgeUUID" = "test"."Fixture"('Badge.Revoked');
    PERFORM "test"."AssertEquals"(_RevokedAt, NULL::timestamptz, 're-awarding should lift the revocation');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAwardBadgeToUser_RejectsANonOwner" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."AwardBadgeToUser"(''member'', %L, %L, %L)',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'), "test"."Fixture"('Badge.Rare')),
        'a plain member awarded themselves a badge'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAwardBadgeToUser_RejectsAUserOutsideTheOrganization" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."AwardBadgeToUser"(''owner'', %L, %L, %L)',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Outsider'), "test"."Fixture"('Badge.Rookie')),
        'a badge was awarded to somebody outside the organization'
    );
END;
$$ LANGUAGE plpgsql;
