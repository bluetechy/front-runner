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
    PERFORM "test"."AssertEquals"(_Badge."EarnedAt", '2024-01-01 00:00:00+00'::timestamptz, 'GetBadges returned the wrong EarnedAt');
    PERFORM "test"."AssertEquals"(_Badge."EarnedDescription", 'Signed up', 'GetBadges returned the wrong EarnedDescription');
END;
$$ LANGUAGE plpgsql;

-- A UserBadges row with a NULL EarnedAt is progress towards a badge, not a
-- badge. The member is 4/10 of the way to this one.
CREATE FUNCTION "test"."TestGetBadges_ExcludesBadgesStillInProgress" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetBadges"('member', "test"."Fixture"('Organization.Acme')) AS "Badges"
    WHERE "Badges"."BadgeUUID" = "test"."Fixture"('Badge.InProgress');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetBadges returned a badge the user has not earned yet');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetBadges_ExcludesRevokedBadges" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetBadges"('member', "test"."Fixture"('Organization.Acme')) AS "Badges"
    WHERE "Badges"."BadgeUUID" = "test"."Fixture"('Badge.Revoked');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetBadges returned a badge that had been revoked');
END;
$$ LANGUAGE plpgsql;

-- Revoking is an update, not a delete: the row stays, and the badge stops
-- being returned the moment RevokedAt is set.
CREATE FUNCTION "test"."TestGetBadges_StopsReturningABadgeWhenItIsRevoked" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    UPDATE "dbo"."UserBadges" SET "RevokedAt" = now(), "UpdatedBy" = 'test'
    WHERE "UserUUID" = "test"."Fixture"('User.Member')
        AND "OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "BadgeUUID" = "test"."Fixture"('Badge.Rookie');

    SELECT count(*) INTO _Count FROM "dbo"."GetBadges"('member', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetBadges kept returning a badge after it was revoked');
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
