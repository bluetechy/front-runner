-- Acme has three memberships in the fixtures and one of them is disabled, so
-- two come back -- the same two dbo.GetOrganizations counts.
CREATE FUNCTION "test"."TestGetOrganizationMembers_ListsTheEnabledMembers" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetOrganizationMembers"('owner', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 2::bigint, 'the member list should hold the owner and the member');

    SELECT count(*) INTO _Count FROM "dbo"."GetOrganizationMembers"('owner', "test"."Fixture"('Organization.Acme')) AS "Members"
    WHERE "Members"."LoginName" = 'disabled';
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'the member list returned a disabled account');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetOrganizationMembers_ReportsWhoOwnsTheOrganization" () RETURNS void AS $$
DECLARE
    _Member record;
BEGIN
    SELECT * INTO _Member FROM "dbo"."GetOrganizationMembers"('owner', "test"."Fixture"('Organization.Acme')) AS "Members"
    WHERE "Members"."LoginName" = 'owner';
    PERFORM "test"."AssertTrue"(_Member."IsOwner", 'the owner was not flagged as one');
    PERFORM "test"."AssertEquals"(_Member."Name"::text, 'Olivia Owner', 'the member list returned the wrong name');
    PERFORM "test"."AssertEquals"(_Member."Email"::text, 'owner@example.test', 'the member list returned the wrong address');
    PERFORM "test"."AssertTrue"(_Member."JoinedAt" IS NOT NULL, 'the member list did not report when they joined');

    SELECT * INTO _Member FROM "dbo"."GetOrganizationMembers"('owner', "test"."Fixture"('Organization.Acme')) AS "Members"
    WHERE "Members"."LoginName" = 'member';
    PERFORM "test"."AssertFalse"(_Member."IsOwner", 'a plain member was flagged as an owner');
END;
$$ LANGUAGE plpgsql;

-- Owners sort first so the people who can act on the list are at the top of it.
CREATE FUNCTION "test"."TestGetOrganizationMembers_PutsOwnersFirst" () RETURNS void AS $$
DECLARE
    _First record;
BEGIN
    SELECT * INTO _First FROM "dbo"."GetOrganizationMembers"('member', "test"."Fixture"('Organization.Acme')) LIMIT 1;
    PERFORM "test"."AssertTrue"(_First."IsOwner", 'the member list did not lead with an owner');
END;
$$ LANGUAGE plpgsql;

-- Knowing who else is in the room is not an administrative privilege, so this
-- takes membership rather than ownership -- unlike GetOrganizationInvitations.
CREATE FUNCTION "test"."TestGetOrganizationMembers_IsReadableByAnyMember" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetOrganizationMembers"('member', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 2::bigint, 'a plain member could not read the member list');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetOrganizationMembers_RejectsAnOutsider" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."GetOrganizationMembers"(%L, %L)',
            'outsider', "test"."Fixture"('Organization.Acme')
        ),
        'somebody outside the organization read its member list',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;
