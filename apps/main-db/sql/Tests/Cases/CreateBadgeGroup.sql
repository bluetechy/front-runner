--
-- The draft created the group and nothing else, leaving it at 0 of 0.
--

CREATE FUNCTION "test"."TestCreateBadgeGroup_CreatesTheGroupWithItsBadges" () RETURNS void AS $$
DECLARE
    _UUID uuid;
    _Row record;
BEGIN
    _UUID := "dbo"."CreateBadgeGroup"('owner', "test"."Fixture"('Organization.Acme'), 'Advanced', 'Harder badges.',
                                      ARRAY["test"."Fixture"('Badge.Rare'), "test"."Fixture"('Badge.Rookie')]);

    SELECT * INTO _Row FROM "dbo"."GetBadgeGroups"('owner', "test"."Fixture"('Organization.Acme'))
    WHERE "BadgeGroupUUID" = _UUID;
    PERFORM "test"."AssertEquals"(_Row."TotalBadges", 2::bigint, 'both badges should be in the group');
    PERFORM "test"."AssertEquals"(_Row."EarnedBadges", 1::bigint, 'and the owner holds one of them');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestCreateBadgeGroup_AllowsAnEmptyGroup" () RETURNS void AS $$
DECLARE
    _UUID uuid;
    _Total bigint;
BEGIN
    _UUID := "dbo"."CreateBadgeGroup"('owner', "test"."Fixture"('Organization.Acme'), 'Empty');
    SELECT "TotalBadges" INTO _Total FROM "dbo"."GetBadgeGroups"('owner', "test"."Fixture"('Organization.Acme'))
    WHERE "BadgeGroupUUID" = _UUID;
    PERFORM "test"."AssertEquals"(_Total, 0::bigint, 'a group can start empty and be filled later');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestCreateBadgeGroup_IgnoresARepeatedBadge" () RETURNS void AS $$
DECLARE
    _UUID uuid;
    _Total bigint;
BEGIN
    _UUID := "dbo"."CreateBadgeGroup"('owner', "test"."Fixture"('Organization.Acme'), 'Dupes', NULL,
                                      ARRAY["test"."Fixture"('Badge.Rare'), "test"."Fixture"('Badge.Rare')]);
    SELECT "TotalBadges" INTO _Total FROM "dbo"."GetBadgeGroups"('owner', "test"."Fixture"('Organization.Acme'))
    WHERE "BadgeGroupUUID" = _UUID;
    PERFORM "test"."AssertEquals"(_Total, 1::bigint, 'the same badge listed twice should go in once');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestCreateBadgeGroup_RejectsANonOwner" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."CreateBadgeGroup"(''member'', %L, ''Mine'')', "test"."Fixture"('Organization.Acme')),
        'a plain member created a badge group'
    );
END;
$$ LANGUAGE plpgsql;
