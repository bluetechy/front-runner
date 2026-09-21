CREATE FUNCTION "test"."TestRenameOrganization_ChangesTheName" () RETURNS void AS $$
DECLARE
    _Organization record;
BEGIN
    SELECT * INTO _Organization FROM "dbo"."RenameOrganization"('owner', "test"."Fixture"('Organization.Acme'), 'Acme Holdings');

    PERFORM "test"."AssertEquals"(_Organization."Name"::text, 'Acme Holdings', 'RenameOrganization returned the old name');
    PERFORM "test"."AssertEquals"(
        (SELECT "Organizations"."Name"::text FROM "dbo"."Organizations" WHERE "Organizations"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')),
        'Acme Holdings',
        'the rename did not reach the table'
    );
END;
$$ LANGUAGE plpgsql;

-- It returns the same shape GetOrganizations does, so a client can put the row
-- straight back into the list it came from.
CREATE FUNCTION "test"."TestRenameOrganization_ReturnsTheCountsAndTheCallersRole" () RETURNS void AS $$
DECLARE
    _Organization record;
BEGIN
    SELECT * INTO _Organization FROM "dbo"."RenameOrganization"('owner', "test"."Fixture"('Organization.Acme'), 'Acme Holdings');

    PERFORM "test"."AssertEquals"(_Organization."TeamCount", 2, 'TeamCount should exclude the archived team');
    PERFORM "test"."AssertEquals"(_Organization."UserCount", 2, 'UserCount should exclude the disabled user');
    PERFORM "test"."AssertEquals"(_Organization."OwnerCount", 1, 'OwnerCount is wrong');
    PERFORM "test"."AssertTrue"(_Organization."IsOwner", 'the caller renamed it, so they own it');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestRenameOrganization_TrimsTheName" () RETURNS void AS $$
DECLARE
    _Organization record;
BEGIN
    SELECT * INTO _Organization FROM "dbo"."RenameOrganization"('owner', "test"."Fixture"('Organization.Acme'), '   Acme Holdings   ');
    PERFORM "test"."AssertEquals"(_Organization."Name"::text, 'Acme Holdings', 'the name was not trimmed');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestRenameOrganization_RejectsABlankName" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."RenameOrganization"(%L, %L, %L)', 'owner', "test"."Fixture"('Organization.Acme'), '   '),
        'an organization was renamed to nothing',
        'A name is required.'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestRenameOrganization_RejectsANonOwner" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."RenameOrganization"(%L, %L, %L)', 'member', "test"."Fixture"('Organization.Acme'), 'Member Holdings'),
        'a plain member renamed the organization',
        'Action cannot be performed.'
    );
    PERFORM "test"."AssertEquals"(
        (SELECT "Organizations"."Name"::text FROM "dbo"."Organizations" WHERE "Organizations"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')),
        'Acme',
        'the rejected call still renamed the organization'
    );
END;
$$ LANGUAGE plpgsql;
