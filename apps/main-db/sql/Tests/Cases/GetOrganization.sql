CREATE FUNCTION "test"."TestGetOrganization_ReturnsTheOneAskedFor" () RETURNS void AS $$
DECLARE
    _Organization record;
BEGIN
    SELECT * INTO _Organization FROM "dbo"."GetOrganization"('owner', "test"."Fixture"('Organization.Acme'));

    PERFORM "test"."AssertEquals"(_Organization."OrganizationUUID", "test"."Fixture"('Organization.Acme'), 'GetOrganization returned the wrong organization');
    PERFORM "test"."AssertEquals"(_Organization."Name"::text, 'Acme', 'GetOrganization returned the wrong name');
    PERFORM "test"."AssertEquals"(_Organization."TeamCount", 2, 'TeamCount should exclude the archived team');
    PERFORM "test"."AssertEquals"(_Organization."UserCount", 2, 'UserCount should exclude the disabled user');
    PERFORM "test"."AssertTrue"(_Organization."IsOwner", 'the owner was not flagged as one');
    PERFORM "test"."AssertTrue"(_Organization."IsEnabled", 'Acme is enabled');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetOrganization_ReportsTheCallersOwnRole" () RETURNS void AS $$
DECLARE
    _Organization record;
BEGIN
    SELECT * INTO _Organization FROM "dbo"."GetOrganization"('member', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertFalse"(_Organization."IsOwner", 'a plain member was flagged as an owner');
END;
$$ LANGUAGE plpgsql;

-- The case the plural GetOrganizations cannot serve: an owner looking at an
-- organization they have archived, so that they can restore it.
CREATE FUNCTION "test"."TestGetOrganization_StillReturnsADisabledOrganization" () RETURNS void AS $$
DECLARE
    _Organization record;
BEGIN
    SELECT * INTO _Organization FROM "dbo"."GetOrganization"('owner', "test"."Fixture"('Organization.Disabled'));

    PERFORM "test"."AssertEquals"(_Organization."OrganizationUUID", "test"."Fixture"('Organization.Disabled'), 'an owner could not see their archived organization');
    PERFORM "test"."AssertFalse"(_Organization."IsEnabled", 'the archived organization did not report itself as archived');
END;
$$ LANGUAGE plpgsql;

-- A miss, not a violation: raising would confirm the organization exists.
CREATE FUNCTION "test"."TestGetOrganization_ReturnsNothingForSomebodyOutsideIt" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetOrganization"('outsider', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetOrganization answered somebody who does not belong to it');

    SELECT count(*) INTO _Count FROM "dbo"."GetOrganization"('owner', '00000000-0000-4000-8000-000000000000');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetOrganization answered for an organization that does not exist');
END;
$$ LANGUAGE plpgsql;
