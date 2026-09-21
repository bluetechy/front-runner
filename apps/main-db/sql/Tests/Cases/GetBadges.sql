CREATE FUNCTION "test"."TestGetBadges_ReturnsTheBadgesAUserHolds" () RETURNS void AS $$
DECLARE
    _Badge record;
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetBadges"('member', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'the member holds one enabled badge');

    SELECT * INTO _Badge FROM "dbo"."GetBadges"('member', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Badge."BadgeUUID", "test"."Fixture"('Badge.Rookie'), 'GetBadges returned the wrong badge');
    PERFORM "test"."AssertEquals"(_Badge."Name"::text, 'Rookie', 'GetBadges returned the wrong badge name');
    PERFORM "test"."AssertEquals"(_Badge."Level", 1, 'GetBadges returned the wrong badge level');
END;
$$ LANGUAGE plpgsql;

-- The member holds the retired badge too; a disabled badge is invisible even
-- to the user who earned it.
CREATE FUNCTION "test"."TestGetBadges_ExcludesDisabledBadges" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetBadges"('member', "test"."Fixture"('Organization.Acme')) AS "Badges"
    WHERE "Badges"."BadgeUUID" = "test"."Fixture"('Badge.Retired');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetBadges returned a disabled badge');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetBadges_ReturnsNothingForANonMember" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetBadges"('outsider', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetBadges answered a caller who is not in the organization');
END;
$$ LANGUAGE plpgsql;
