--
-- dbo.UserBadges carries state now, not just the three UUIDs, so it gets its
-- own case file. Structural facts about every table stay in Schema.sql; these
-- are about what this one table means.
--

-- The progress columns are only reachable through the table today; GetBadges
-- deals in earned badges. Replace this with a test of the reader when one
-- exists -- see SCHEMA-NOTES.md.
CREATE FUNCTION "test"."TestUserBadges_TracksProgressTowardsAnUnearnedBadge" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    SELECT * INTO _Row FROM "dbo"."UserBadges"
    WHERE "UserUUID" = "test"."Fixture"('User.Member')
        AND "OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "BadgeUUID" = "test"."Fixture"('Badge.InProgress');

    PERFORM "test"."AssertEquals"(_Row."ProgressCurrent", 4, 'the in-progress badge lost its ProgressCurrent');
    PERFORM "test"."AssertEquals"(_Row."ProgressGoal", 10, 'the in-progress badge lost its ProgressGoal');
    PERFORM "test"."AssertEquals"(_Row."EarnedAt", NULL::timestamptz, 'an unearned badge should have no EarnedAt');
END;
$$ LANGUAGE plpgsql;

-- ProgressCurrent defaults to 0 rather than NULL, so arithmetic on it never
-- has to guard for a missing value.
CREATE FUNCTION "test"."TestUserBadges_StartsProgressAtZero" () RETURNS void AS $$
DECLARE
    _Progress integer;
BEGIN
    INSERT INTO "dbo"."UserBadges" ("UserUUID", "OrganizationUUID", "BadgeUUID", "CreatedBy")
    VALUES ("test"."Fixture"('User.Owner'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Rookie'), 'test');

    SELECT "ProgressCurrent" INTO _Progress FROM "dbo"."UserBadges"
    WHERE "UserUUID" = "test"."Fixture"('User.Owner')
        AND "OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "BadgeUUID" = "test"."Fixture"('Badge.Rookie');
    PERFORM "test"."AssertEquals"(_Progress, 0, 'a new UserBadges row should start at zero progress');
END;
$$ LANGUAGE plpgsql;
