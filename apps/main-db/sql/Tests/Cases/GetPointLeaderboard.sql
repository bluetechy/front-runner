--
-- Acme has the owner (7 Points), the member (12.5) and the disabled user (no
-- tally). The disabled user is excluded; the owner ranks below the member.
--
-- The LEFT JOIN is the part carried over deliberately from the draft: someone
-- with no tally row still appears, on zero.
--

CREATE FUNCTION "test"."TestGetPointLeaderboard_RanksTheOrganizationHighestFirst" () RETURNS void AS $$
DECLARE
    _Order text;
BEGIN
    SELECT string_agg("Name", ', ' ORDER BY "Position") INTO _Order
    FROM "dbo"."GetPointLeaderboard"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'));
    PERFORM "test"."AssertEquals"(_Order, 'Marcus Member, Olivia Owner', '12.5 outranks 7');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPointLeaderboard_ExcludesDisabledUsers" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetPointLeaderboard"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'))
    WHERE "UserUUID" = "test"."Fixture"('User.Disabled');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'the disabled user belongs to Acme and must not be ranked');
END;
$$ LANGUAGE plpgsql;

-- Nobody holds Gems but the member, so this is the case the LEFT JOIN exists
-- for: the owner still appears, on zero.
CREATE FUNCTION "test"."TestGetPointLeaderboard_IncludesUsersWithNoTally" () RETURNS void AS $$
DECLARE
    _Owner record;
BEGIN
    SELECT * INTO _Owner FROM "dbo"."GetPointLeaderboard"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Gems'))
    WHERE "UserUUID" = "test"."Fixture"('User.Owner');
    PERFORM "test"."AssertEquals"(_Owner."Amount", 0.0000::decimal(19,4), 'a user with no tally for this point type ranks on zero, not missing');
END;
$$ LANGUAGE plpgsql;

-- GetPointLeaderboardForGroup was this parameter. The owner and the member are
-- both on Team.Core; only the member is on Team.Support.
CREATE FUNCTION "test"."TestGetPointLeaderboard_NarrowsToATeam" () RETURNS void AS $$
DECLARE
    _Core text;
    _Support text;
BEGIN
    SELECT string_agg("Name", ', ' ORDER BY "Position") INTO _Core
    FROM "dbo"."GetPointLeaderboard"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), "test"."Fixture"('Team.Core'));
    SELECT string_agg("Name", ', ' ORDER BY "Position") INTO _Support
    FROM "dbo"."GetPointLeaderboard"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), "test"."Fixture"('Team.Support'));

    PERFORM "test"."AssertEquals"(_Core, 'Marcus Member, Olivia Owner', 'both are on the core team');
    PERFORM "test"."AssertEquals"(_Support, 'Marcus Member', 'only the member is on support');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPointLeaderboard_AppliesARowLimit" () RETURNS void AS $$
DECLARE
    _Name text;
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetPointLeaderboard"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), NULL, 1);
    SELECT "Name" INTO _Name FROM "dbo"."GetPointLeaderboard"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), NULL, 1);
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'a limit of one returns one');
    PERFORM "test"."AssertEquals"(_Name, 'Marcus Member', 'and it should be the top of the board, not an arbitrary row');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPointLeaderboard_ReturnsNothingForANonMember" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetPointLeaderboard"('outsider', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'));
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'a leaderboard is organization data and the outsider is not in one');
END;
$$ LANGUAGE plpgsql;
