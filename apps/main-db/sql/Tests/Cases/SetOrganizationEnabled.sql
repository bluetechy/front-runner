CREATE FUNCTION "test"."TestSetOrganizationEnabled_ArchivesAnOrganization" () RETURNS void AS $$
DECLARE
    _Organization record;
BEGIN
    SELECT * INTO _Organization FROM "dbo"."SetOrganizationEnabled"('owner', "test"."Fixture"('Organization.Acme'), false);

    PERFORM "test"."AssertFalse"(_Organization."IsEnabled", 'the archived organization was returned as enabled');
    PERFORM "test"."AssertFalse"(
        "dbo"."IsMemberOfOrganization"('member', "test"."Fixture"('Organization.Acme')),
        'an archived organization still reports members'
    );
END;
$$ LANGUAGE plpgsql;

-- Archiving hides, it does not delete. Everything has to survive the round trip.
CREATE FUNCTION "test"."TestSetOrganizationEnabled_KeepsEverythingAndRestoresIt" () RETURNS void AS $$
DECLARE
    _Organization record;
    _Members bigint;
BEGIN
    SELECT count(*) INTO _Members FROM "dbo"."UserOrganizations"
    WHERE "UserOrganizations"."OrganizationUUID" = "test"."Fixture"('Organization.Acme');

    PERFORM "dbo"."SetOrganizationEnabled"('owner', "test"."Fixture"('Organization.Acme'), false);
    PERFORM "test"."AssertEquals"(
        (SELECT count(*) FROM "dbo"."UserOrganizations" WHERE "UserOrganizations"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')),
        _Members,
        'archiving an organization dropped its memberships'
    );

    SELECT * INTO _Organization FROM "dbo"."SetOrganizationEnabled"('owner', "test"."Fixture"('Organization.Acme'), true);
    PERFORM "test"."AssertTrue"(_Organization."IsEnabled", 'the organization did not come back');
    PERFORM "test"."AssertTrue"(
        "dbo"."IsMemberOfOrganization"('member', "test"."Fixture"('Organization.Acme')),
        'restoring the organization did not restore its memberships'
    );
END;
$$ LANGUAGE plpgsql;

-- The check has to outlive the thing it checks. Going through
-- IsOwnerOfOrganization -- which requires the organization to be enabled --
-- would leave an owner with no standing to undo their own archive.
CREATE FUNCTION "test"."TestSetOrganizationEnabled_LetsTheOwnerRestoreWhatTheyArchived" () RETURNS void AS $$
DECLARE
    _Organization record;
BEGIN
    PERFORM "test"."AssertFalse"(
        "dbo"."IsOwnerOfOrganization"('owner', "test"."Fixture"('Organization.Disabled')),
        'IsOwnerOfOrganization is supposed to refuse a disabled organization'
    );

    SELECT * INTO _Organization FROM "dbo"."SetOrganizationEnabled"('owner', "test"."Fixture"('Organization.Disabled'), true);
    PERFORM "test"."AssertTrue"(_Organization."IsEnabled", 'the owner could not restore their own archived organization');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSetOrganizationEnabled_RejectsANonOwner" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."SetOrganizationEnabled"(%L, %L, false)',
            'member', "test"."Fixture"('Organization.Acme')
        ),
        'a plain member archived the organization',
        'Action cannot be performed.'
    );
    PERFORM "test"."AssertTrue"(
        "dbo"."IsMemberOfOrganization"('member', "test"."Fixture"('Organization.Acme')),
        'the rejected call still archived the organization'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSetOrganizationEnabled_RejectsAnOutsider" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."SetOrganizationEnabled"(%L, %L, false)',
            'outsider', "test"."Fixture"('Organization.Acme')
        ),
        'somebody outside the organization archived it',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;
