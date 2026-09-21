CREATE FUNCTION "test"."TestAddOrganization_CreatesTheOrganization" () RETURNS void AS $$
DECLARE
    _Result record;
    _Count bigint;
BEGIN
    SELECT * INTO _Result FROM "dbo"."AddOrganization"('member', 'New Company');

    PERFORM "test"."AssertEquals"(_Result."Name"::text, 'New Company', 'AddOrganization returned the wrong name');
    PERFORM "test"."AssertEquals"(_Result."TeamCount", 0, 'a new organization has no teams');
    PERFORM "test"."AssertEquals"(_Result."UserCount", 1, 'a new organization has its creator in it');
    PERFORM "test"."AssertEquals"(_Result."OwnerCount", 1, 'the creator owns the new organization');
    PERFORM "test"."AssertTrue"(_Result."IsOwner", 'AddOrganization did not flag the creator as owner');

    SELECT count(*) INTO _Count FROM "dbo"."Organizations" WHERE "Organizations"."OrganizationUUID" = _Result."OrganizationUUID";
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'AddOrganization did not write the organization row');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAddOrganization_MakesTheCallerAMember" () RETURNS void AS $$
DECLARE
    _Result record;
    _IsOwner boolean;
BEGIN
    SELECT * INTO _Result FROM "dbo"."AddOrganization"('member', 'New Company');

    SELECT "UserOrganizations"."IsOwner" INTO _IsOwner
    FROM "dbo"."UserOrganizations"
    WHERE "UserOrganizations"."OrganizationUUID" = _Result."OrganizationUUID"
        AND "UserOrganizations"."UserUUID" = "test"."Fixture"('User.Member');

    PERFORM "test"."AssertTrue"(_IsOwner, 'AddOrganization did not record the creator as an owner');
    PERFORM "test"."AssertTrue"(
        "dbo"."IsOwnerOfOrganization"('member', _Result."OrganizationUUID"),
        'the creator cannot act as owner of the organization they just created'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAddOrganization_CanCreateANonOwnedOrganization" () RETURNS void AS $$
DECLARE
    _Result record;
BEGIN
    SELECT * INTO _Result FROM "dbo"."AddOrganization"('member', 'Unowned Company', false);
    PERFORM "test"."AssertFalse"(_Result."IsOwner", 'AddOrganization ignored _IsOwner => false');
    PERFORM "test"."AssertEquals"(_Result."OwnerCount", 0, 'an unowned organization should report no owners');
END;
$$ LANGUAGE plpgsql;
