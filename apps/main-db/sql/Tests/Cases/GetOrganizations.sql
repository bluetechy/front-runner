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

-- An archived organization is not somewhere you are working, so it is out of
-- the default list -- but its owner has to be able to find it again to restore
-- it. See dbo.SetOrganizationEnabled.
CREATE FUNCTION "test"."TestGetOrganizations_IncludesDisabledOnesOnRequest" () RETURNS void AS $$
DECLARE
    _Organization record;
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetOrganizations"('owner', true);
    PERFORM "test"."AssertEquals"(_Count, 2::bigint, 'the owner belongs to two organizations, one of them archived');

    SELECT count(*) INTO _Count FROM "dbo"."GetOrganizations"('owner', true) AS "Organizations"
    WHERE "Organizations"."OrganizationUUID" = "test"."Fixture"('Organization.Disabled');
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'the archived organization was still hidden');

    -- Asking for archived organizations is no use without being able to tell
    -- which of them are archived.
    SELECT * INTO _Organization FROM "dbo"."GetOrganizations"('owner', true) AS "Organizations"
    WHERE "Organizations"."OrganizationUUID" = "test"."Fixture"('Organization.Disabled');
    PERFORM "test"."AssertFalse"(_Organization."IsEnabled", 'the archived organization did not report itself as archived');

    SELECT * INTO _Organization FROM "dbo"."GetOrganizations"('owner', true) AS "Organizations"
    WHERE "Organizations"."OrganizationUUID" = "test"."Fixture"('Organization.Acme');
    PERFORM "test"."AssertTrue"(_Organization."IsEnabled", 'an enabled organization reported itself as archived');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetOrganizations_HidesDisabledOnesByDefault" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    PERFORM "test"."AssertEquals"(
        (SELECT count(*) FROM "dbo"."GetOrganizations"('owner')),
        (SELECT count(*) FROM "dbo"."GetOrganizations"('owner', false)),
        'the default disagrees with asking for enabled organizations explicitly'
    );
END;
$$ LANGUAGE plpgsql;

-- Every function that returns the organization shape reports IsEnabled, so a
-- client can treat a row the same way whichever call produced it.
CREATE FUNCTION "test"."TestGetOrganizations_SharesItsShapeWithTheOrganizationWriters" () RETURNS void AS $$
DECLARE
    _Organization record;
BEGIN
    SELECT * INTO _Organization FROM "dbo"."AddOrganization"('owner', 'Fresh Start');
    PERFORM "test"."AssertTrue"(_Organization."IsEnabled", 'a newly created organization should be enabled');

    SELECT * INTO _Organization FROM "dbo"."RenameOrganization"('owner', "test"."Fixture"('Organization.Acme'), 'Acme Holdings');
    PERFORM "test"."AssertTrue"(_Organization."IsEnabled", 'RenameOrganization did not report IsEnabled');

    SELECT * INTO _Organization FROM "dbo"."LeaveOrganization"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'));
    PERFORM "test"."AssertTrue"(_Organization."IsEnabled", 'LeaveOrganization did not report IsEnabled');
END;
$$ LANGUAGE plpgsql;
