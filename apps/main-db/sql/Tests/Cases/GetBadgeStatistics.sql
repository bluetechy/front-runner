--
-- Rookie: held by the member, shared once. InProgress: nobody holds it, one
-- person is working on it. That pair is what separates the two counts.
--

CREATE FUNCTION "test"."TestGetBadgeStatistics_SeparateHoldersFromInProgress" () RETURNS void AS $$
DECLARE
    _Rookie record;
    _Partial record;
BEGIN
    SELECT * INTO _Rookie FROM "dbo"."GetBadgeStatistics"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Rookie'));
    SELECT * INTO _Partial FROM "dbo"."GetBadgeStatistics"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.InProgress'));

    PERFORM "test"."AssertEquals"(_Rookie."Holders", 1::bigint, 'the member holds Rookie');
    PERFORM "test"."AssertEquals"(_Rookie."InProgress", 0::bigint, 'and nobody is part-way to it');
    PERFORM "test"."AssertEquals"(_Partial."Holders", 0::bigint, 'nobody holds the in-progress badge');
    PERFORM "test"."AssertEquals"(_Partial."InProgress", 1::bigint, 'and one person is working on it');
END;
$$ LANGUAGE plpgsql;

-- BadgeCompletionAnalytics divided completions by the number of people who
-- already held the badge, so its rate was near 100% by construction. The rate
-- here is holders over holders-plus-in-progress.
CREATE FUNCTION "test"."TestGetBadgeStatistics_RateTheHoldersAgainstEveryoneAttempting" () RETURNS void AS $$
DECLARE
    _Rate decimal(5,2);
BEGIN
    INSERT INTO "dbo"."UserBadges" ("UserUUID", "OrganizationUUID", "BadgeUUID", "ProgressCurrent", "CreatedBy")
    VALUES ("test"."Fixture"('User.Owner'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Rookie'), 0, 'test');

    SELECT "CompletionRate" INTO _Rate FROM "dbo"."GetBadgeStatistics"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Rookie'));
    PERFORM "test"."AssertEquals"(_Rate, 50.00::decimal(5,2), 'one holder and one still trying is 50%, not 100%');
END;
$$ LANGUAGE plpgsql;

-- BadgeSharingAnalytics read a UserSharedBadges table that never existed.
CREATE FUNCTION "test"."TestGetBadgeStatistics_CountShares" () RETURNS void AS $$
DECLARE
    _Shares bigint;
BEGIN
    SELECT "Shares" INTO _Shares FROM "dbo"."GetBadgeStatistics"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Rookie'));
    PERFORM "test"."AssertEquals"(_Shares, 1::bigint, 'the member shared Rookie with the owner once');
END;
$$ LANGUAGE plpgsql;

-- The draft joined BadgeCriteria without grouping by it, so a badge with two
-- criteria counted every holder twice.
CREATE FUNCTION "test"."TestGetBadgeStatistics_AreNotDoubledByASecondCriteria" () RETURNS void AS $$
DECLARE
    _Holders bigint;
BEGIN
    INSERT INTO "dbo"."BadgeCriteria" ("BadgeUUID", "Description", "BadgeType", "Value", "CreatedBy")
    VALUES ("test"."Fixture"('Badge.Rookie'), 'A second hoop.', 'Activity', 1, 'test');

    SELECT "Holders" INTO _Holders FROM "dbo"."GetBadgeStatistics"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Rookie'));
    PERFORM "test"."AssertEquals"(_Holders, 1::bigint, 'still one holder, however many criteria the badge has');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetBadgeStatistics_ExcludeDisabledBadges" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetBadgeStatistics"('member', "test"."Fixture"('Organization.Acme'))
    WHERE "BadgeUUID" = "test"."Fixture"('Badge.Retired');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'a retired badge should not appear in uptake figures');
END;
$$ LANGUAGE plpgsql;
