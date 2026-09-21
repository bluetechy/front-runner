CREATE FUNCTION "test"."TestJoinOrganization_AddsTheUser" () RETURNS void AS $$
DECLARE
    _Result record;
BEGIN
    SELECT * INTO _Result FROM "dbo"."JoinOrganization"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Outsider'));

    PERFORM "test"."AssertTrue"(
        "dbo"."IsMemberOfOrganization"('outsider', "test"."Fixture"('Organization.Acme')),
        'the user was not added to the organization'
    );
    PERFORM "test"."AssertEquals"(_Result."UserCount", 3, 'the user count should include the newly added member');
    PERFORM "test"."AssertFalse"(_Result."IsOwner", 'a user added to an organization should not become an owner');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestJoinOrganization_RejectsANonOwner" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."JoinOrganization"(%L, %L, %L)',
            'member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Outsider')
        ),
        'a plain member was allowed to add users to the organization',
        'Action cannot be performed.'
    );
    PERFORM "test"."AssertFalse"(
        "dbo"."IsMemberOfOrganization"('outsider', "test"."Fixture"('Organization.Acme')),
        'the rejected call still added the user'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestJoinOrganization_IsIdempotent" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    PERFORM "dbo"."JoinOrganization"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Outsider'));
    PERFORM "dbo"."JoinOrganization"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Outsider'));

    SELECT count(*) INTO _Count FROM "dbo"."UserOrganizations"
    WHERE "UserOrganizations"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserOrganizations"."UserUUID" = "test"."Fixture"('User.Outsider');
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'joining twice created two membership rows');
END;
$$ LANGUAGE plpgsql;
