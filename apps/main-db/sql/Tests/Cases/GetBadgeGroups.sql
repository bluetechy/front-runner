--
-- The Starter group holds Rookie and InProgress. The member has earned one of
-- the two.
--

CREATE FUNCTION "test"."TestGetBadgeGroups_CountBadgesAndProgress" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    SELECT * INTO _Row FROM "dbo"."GetBadgeGroups"('member', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Row."Name"::text, 'Starter', 'there is one group');
    PERFORM "test"."AssertEquals"(_Row."TotalBadges", 2::bigint, 'with two badges in it');
    PERFORM "test"."AssertEquals"(_Row."EarnedBadges", 1::bigint, 'of which the member has earned one');
END;
$$ LANGUAGE plpgsql;

-- GetBadgeGroupProgress counted UserBadges rows without checking they were
-- earned, so a badge in progress counted as complete.
CREATE FUNCTION "test"."TestGetBadgeGroups_DoNotCountInProgressAsEarned" () RETURNS void AS $$
DECLARE
    _Earned bigint;
BEGIN
    PERFORM "test"."AssertRowCount"(
        format('SELECT 1 FROM "dbo"."UserBadges" WHERE "UserUUID" = %L AND "BadgeUUID" = %L',
            "test"."Fixture"('User.Member'), "test"."Fixture"('Badge.InProgress')),
        1, 'the member has a row for the in-progress badge');

    SELECT "EarnedBadges" INTO _Earned FROM "dbo"."GetBadgeGroups"('member', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Earned, 1::bigint, 'but the row is not an earned badge, so the count stays at one');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetBadgeGroups_CanLookAtAnotherUser" () RETURNS void AS $$
DECLARE
    _Earned bigint;
BEGIN
    SELECT "EarnedBadges" INTO _Earned FROM "dbo"."GetBadgeGroups"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Owner'));
    PERFORM "test"."AssertEquals"(_Earned, 0::bigint, 'the owner holds neither of the starter badges');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetBadgeGroups_ReturnNothingForANonMember" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetBadgeGroups"('outsider', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetBadgeGroups answered a caller outside the organization');
END;
$$ LANGUAGE plpgsql;
