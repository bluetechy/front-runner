--
-- Rookie needs 1 and the member has 1; InProgress needs 10 and the member has
-- 4. Badges with no criteria row are not measurable and do not appear.
--

CREATE FUNCTION "test"."TestGetBadgeProgress_ReportsProgressAgainstCriteria" () RETURNS void AS $$
DECLARE
    _Rookie record;
    _Partial record;
BEGIN
    SELECT * INTO _Rookie FROM "dbo"."GetBadgeProgress"('member', "test"."Fixture"('Organization.Acme'))
    WHERE "BadgeUUID" = "test"."Fixture"('Badge.Rookie');
    SELECT * INTO _Partial FROM "dbo"."GetBadgeProgress"('member', "test"."Fixture"('Organization.Acme'))
    WHERE "BadgeUUID" = "test"."Fixture"('Badge.InProgress');

    PERFORM "test"."AssertEquals"(_Rookie."ProgressPercentage", 100.00::decimal(5,2), '1 of 1 is done');
    PERFORM "test"."AssertEquals"(_Partial."ProgressCurrent", 4, 'the member is on four');
    PERFORM "test"."AssertEquals"(_Partial."CriteriaValue", 10, 'out of ten');
    PERFORM "test"."AssertEquals"(_Partial."ProgressPercentage", 40.00::decimal(5,2), 'which is 40%');
END;
$$ LANGUAGE plpgsql;

-- A badge with no criteria cannot be progressed against. Badge.Retired and
-- the rest have none, so only the two with criteria come back.
CREATE FUNCTION "test"."TestGetBadgeProgress_SkipsBadgesWithNoCriteria" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetBadgeProgress"('member', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 2::bigint, 'only Rookie and InProgress carry criteria rows');
END;
$$ LANGUAGE plpgsql;

-- GetNextPotentialBadges and SuggestBadgesForUser were both this filter.
CREATE FUNCTION "test"."TestGetBadgeProgress_CanNarrowToUnearned" () RETURNS void AS $$
DECLARE
    _Name text;
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetBadgeProgress"('member', "test"."Fixture"('Organization.Acme'), NULL, true);
    SELECT "Name" INTO _Name   FROM "dbo"."GetBadgeProgress"('member', "test"."Fixture"('Organization.Acme'), NULL, true);
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'Rookie is earned, so only one is still open');
    PERFORM "test"."AssertEquals"(_Name, 'In Progress', 'and it is the half-finished one');
END;
$$ LANGUAGE plpgsql;

-- A user with no UserBadges row at all sits at zero rather than vanishing.
CREATE FUNCTION "test"."TestGetBadgeProgress_ShowsZeroForAUserWhoHasNotStarted" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    SELECT * INTO _Row FROM "dbo"."GetBadgeProgress"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Owner'))
    WHERE "BadgeUUID" = "test"."Fixture"('Badge.InProgress');
    PERFORM "test"."AssertEquals"(_Row."ProgressCurrent", 0, 'the owner has never started this one');
    PERFORM "test"."AssertEquals"(_Row."ProgressPercentage", 0.00::decimal(5,2), 'so zero percent, not a missing row');
END;
$$ LANGUAGE plpgsql;

-- The draft could report over 100% once progress passed the goal.
CREATE FUNCTION "test"."TestGetBadgeProgress_CapsThePercentageAtOneHundred" () RETURNS void AS $$
DECLARE
    _Percentage decimal(5,2);
BEGIN
    UPDATE "dbo"."UserBadges" SET "ProgressCurrent" = 25, "UpdatedBy" = 'test'
    WHERE "UserUUID" = "test"."Fixture"('User.Member')
        AND "OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "BadgeUUID" = "test"."Fixture"('Badge.InProgress');

    SELECT "ProgressPercentage" INTO _Percentage FROM "dbo"."GetBadgeProgress"('member', "test"."Fixture"('Organization.Acme'))
    WHERE "BadgeUUID" = "test"."Fixture"('Badge.InProgress');
    PERFORM "test"."AssertEquals"(_Percentage, 100.00::decimal(5,2), '25 of 10 is still 100%, not 250%');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetBadgeProgress_ReturnNothingForANonMember" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetBadgeProgress"('outsider', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetBadgeProgress answered a caller outside the organization');
END;
$$ LANGUAGE plpgsql;
