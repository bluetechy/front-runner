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

--
-- The security page's privacy switch, read from here. Withholding an address
-- has to hide it from the people in the room without hiding the person.
--

CREATE FUNCTION "test"."TestGetOrganizationMembers_WithholdsAnAddressItsOwnerMadePrivate" () RETURNS void AS $$
DECLARE
    _Member record;
BEGIN
    PERFORM "dbo"."SetUserEmailPrivacy"('member', true);

    SELECT * INTO _Member FROM "dbo"."GetOrganizationMembers"('owner', "test"."Fixture"('Organization.Acme')) AS "Members"
    WHERE "Members"."UserUUID" = "test"."Fixture"('User.Member');

    PERFORM "test"."AssertEquals"(_Member."Email"::text, '', 'a withheld address was handed to another member');
END;
$$ LANGUAGE plpgsql;

-- The point of the switch is not to be invisible to the people you work with,
-- it is not to hand every one of them a mailbox.
CREATE FUNCTION "test"."TestGetOrganizationMembers_KeepsAPrivateMemberInTheList" () RETURNS void AS $$
DECLARE
    _Member record;
    _Before bigint;
    _After bigint;
BEGIN
    SELECT count(*) INTO _Before FROM "dbo"."GetOrganizationMembers"('owner', "test"."Fixture"('Organization.Acme')) AS "Members";

    PERFORM "dbo"."SetUserEmailPrivacy"('member', true);

    SELECT count(*) INTO _After FROM "dbo"."GetOrganizationMembers"('owner', "test"."Fixture"('Organization.Acme')) AS "Members";
    SELECT * INTO _Member FROM "dbo"."GetOrganizationMembers"('owner', "test"."Fixture"('Organization.Acme')) AS "Members"
    WHERE "Members"."UserUUID" = "test"."Fixture"('User.Member');

    PERFORM "test"."AssertEquals"(_After, _Before, 'withholding an address removed the member from the list');
    PERFORM "test"."AssertEquals"(_Member."Name"::text, 'Marcus Member', 'withholding an address hid the member''s name');
    PERFORM "test"."AssertEquals"(_Member."LoginName"::text, 'member', 'withholding an address hid the member''s login name');
END;
$$ LANGUAGE plpgsql;

-- It hides the address, it does not lose it. Turning the switch off gives it
-- back, which is why it is read here rather than enforced by clearing a column.
CREATE FUNCTION "test"."TestGetOrganizationMembers_GivesTheAddressBackWhenTheSwitchGoesOff" () RETURNS void AS $$
DECLARE
    _Member record;
BEGIN
    PERFORM "dbo"."SetUserEmailPrivacy"('member', true);
    PERFORM "dbo"."SetUserEmailPrivacy"('member', false);

    SELECT * INTO _Member FROM "dbo"."GetOrganizationMembers"('owner', "test"."Fixture"('Organization.Acme')) AS "Members"
    WHERE "Members"."UserUUID" = "test"."Fixture"('User.Member');

    PERFORM "test"."AssertEquals"(_Member."Email"::text, 'member@example.test', 'the address did not come back when the switch went off');
END;
$$ LANGUAGE plpgsql;

-- Everybody else's address is untouched: this is one account's setting, not a
-- switch on the list.
CREATE FUNCTION "test"."TestGetOrganizationMembers_LeavesEverybodyElsesAddressAlone" () RETURNS void AS $$
DECLARE
    _Owner record;
BEGIN
    PERFORM "dbo"."SetUserEmailPrivacy"('member', true);

    SELECT * INTO _Owner FROM "dbo"."GetOrganizationMembers"('owner', "test"."Fixture"('Organization.Acme')) AS "Members"
    WHERE "Members"."UserUUID" = "test"."Fixture"('User.Owner');

    PERFORM "test"."AssertEquals"(_Owner."Email"::text, 'owner@example.test', 'one member''s switch withheld another member''s address');
END;
$$ LANGUAGE plpgsql;

-- Reading your own row is not an exception. It is the same list everybody
-- else is served, and the page already knows your address from elsewhere.
CREATE FUNCTION "test"."TestGetOrganizationMembers_WithholdsAPrivateAddressFromItsOwnerToo" () RETURNS void AS $$
DECLARE
    _Self record;
BEGIN
    PERFORM "dbo"."SetUserEmailPrivacy"('member', true);

    SELECT * INTO _Self FROM "dbo"."GetOrganizationMembers"('member', "test"."Fixture"('Organization.Acme')) AS "Members"
    WHERE "Members"."UserUUID" = "test"."Fixture"('User.Member');

    PERFORM "test"."AssertEquals"(_Self."Email"::text, '', 'the members list served one copy to its owner and another to everybody else');
END;
$$ LANGUAGE plpgsql;
