CREATE FUNCTION "test"."TestGetOrganizations_ReturnsTheOrganizationsAUserBelongsTo" () RETURNS void AS $$
DECLARE
    _Organization record;
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetOrganizations"('owner');
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'the owner belongs to one enabled organization');

    SELECT * INTO _Organization FROM "dbo"."GetOrganizations"('owner');
    PERFORM "test"."AssertEquals"(_Organization."OrganizationUUID", "test"."Fixture"('Organization.Acme'), 'GetOrganizations returned the wrong organization');
    PERFORM "test"."AssertEquals"(_Organization."Name"::text, 'Acme', 'GetOrganizations returned the wrong name');
    PERFORM "test"."AssertTrue"(_Organization."IsOwner", 'GetOrganizations did not flag the owner as owner');
END;
$$ LANGUAGE plpgsql;

-- The counts skip disabled teams and disabled users, which is why Acme has
-- three teams and three members in the fixtures but reports two of each.
CREATE FUNCTION "test"."TestGetOrganizations_CountsOnlyEnabledTeamsAndUsers" () RETURNS void AS $$
DECLARE
    _Organization record;
BEGIN
    SELECT * INTO _Organization FROM "dbo"."GetOrganizations"('owner');
    PERFORM "test"."AssertEquals"(_Organization."TeamCount", 2, 'TeamCount should exclude the archived team');
    PERFORM "test"."AssertEquals"(_Organization."UserCount", 2, 'UserCount should exclude the disabled user');
    PERFORM "test"."AssertEquals"(_Organization."OwnerCount", 1, 'OwnerCount should count only the owner');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetOrganizations_ReportsAPlainMemberAsNotOwner" () RETURNS void AS $$
DECLARE
    _Organization record;
BEGIN
    SELECT * INTO _Organization FROM "dbo"."GetOrganizations"('member');
    PERFORM "test"."AssertFalse"(_Organization."IsOwner", 'GetOrganizations flagged a plain member as owner');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetOrganizations_ExcludesDisabledOrganizations" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetOrganizations"('owner') AS "Organizations"
    WHERE "Organizations"."OrganizationUUID" = "test"."Fixture"('Organization.Disabled');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetOrganizations returned a disabled organization');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetOrganizations_ReturnsNothingForAnOutsider" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetOrganizations"('outsider');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetOrganizations returned rows for a user who belongs to nothing');
END;
$$ LANGUAGE plpgsql;
