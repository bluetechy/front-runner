CREATE FUNCTION "test"."TestSetOrganizationRole_PromotesAMemberToOwner" () RETURNS void AS $$
DECLARE
    _Member record;
BEGIN
    SELECT * INTO _Member FROM "dbo"."SetOrganizationRole"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'), true);

    PERFORM "test"."AssertTrue"(_Member."IsOwner", 'the promoted member was not returned as an owner');
    PERFORM "test"."AssertTrue"(
        "dbo"."IsOwnerOfOrganization"('member', "test"."Fixture"('Organization.Acme')),
        'the promotion did not take effect'
    );
END;
$$ LANGUAGE plpgsql;

-- The handover this exists for: promote the successor, then step down.
CREATE FUNCTION "test"."TestSetOrganizationRole_LetsAnOwnerHandOverAndStepDown" () RETURNS void AS $$
DECLARE
    _Member record;
BEGIN
    PERFORM "dbo"."SetOrganizationRole"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'), true);
    SELECT * INTO _Member FROM "dbo"."SetOrganizationRole"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Owner'), false);

    PERFORM "test"."AssertFalse"(_Member."IsOwner", 'the outgoing owner was still returned as one');
    PERFORM "test"."AssertFalse"(
        "dbo"."IsOwnerOfOrganization"('owner', "test"."Fixture"('Organization.Acme')),
        'the outgoing owner kept their ownership'
    );
    PERFORM "test"."AssertTrue"(
        "dbo"."IsOwnerOfOrganization"('member', "test"."Fixture"('Organization.Acme')),
        'the successor did not keep theirs'
    );
END;
$$ LANGUAGE plpgsql;

-- The mirror of the guard on LeaveOrganization. Without it an owner could
-- demote themselves and leave the organization with nobody who can undo it.
CREATE FUNCTION "test"."TestSetOrganizationRole_RefusesToDemoteTheLastOwner" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."SetOrganizationRole"(%L, %L, %L, false)',
            'owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Owner')
        ),
        'the only owner demoted themselves',
        'The last owner cannot be demoted.'
    );
    PERFORM "test"."AssertTrue"(
        "dbo"."IsOwnerOfOrganization"('owner', "test"."Fixture"('Organization.Acme')),
        'the rejected call still demoted the owner'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSetOrganizationRole_RejectsANonOwner" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."SetOrganizationRole"(%L, %L, %L, true)',
            'member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member')
        ),
        'a plain member promoted themselves to owner',
        'Action cannot be performed.'
    );
    PERFORM "test"."AssertFalse"(
        "dbo"."IsOwnerOfOrganization"('member', "test"."Fixture"('Organization.Acme')),
        'the rejected call still granted ownership'
    );
END;
$$ LANGUAGE plpgsql;

-- Ownership is a property of a membership, not a way to create one. Somebody
-- outside the organization has to be invited into it first.
CREATE FUNCTION "test"."TestSetOrganizationRole_RejectsSomebodyWhoIsNotAMember" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."SetOrganizationRole"(%L, %L, %L, true)',
            'owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Outsider')
        ),
        'an outsider was given a role in an organization they do not belong to',
        'does not belong to the organization'
    );

    SELECT count(*) INTO _Count FROM "dbo"."UserOrganizations"
    WHERE "UserOrganizations"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserOrganizations"."UserUUID" = "test"."Fixture"('User.Outsider');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'the rejected call created a membership');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSetOrganizationRole_RejectsADisabledMember" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."SetOrganizationRole"(%L, %L, %L, true)',
            'owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Disabled')
        ),
        'a disabled account was made an owner',
        'does not belong to the organization'
    );
END;
$$ LANGUAGE plpgsql;

-- Setting the role somebody already holds is not an error; it is just nothing.
CREATE FUNCTION "test"."TestSetOrganizationRole_IsIdempotent" () RETURNS void AS $$
DECLARE
    _Member record;
BEGIN
    SELECT * INTO _Member FROM "dbo"."SetOrganizationRole"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'), false);
    PERFORM "test"."AssertFalse"(_Member."IsOwner", 'demoting a plain member changed something');
    PERFORM "test"."AssertTrue"(
        "dbo"."IsMemberOfOrganization"('member', "test"."Fixture"('Organization.Acme')),
        'demoting a plain member removed them'
    );
END;
$$ LANGUAGE plpgsql;

-- The role change must not disturb the membership it sits on.
CREATE FUNCTION "test"."TestSetOrganizationRole_KeepsTheMembershipItself" () RETURNS void AS $$
DECLARE
    _Before timestamptz;
    _Member record;
BEGIN
    SELECT "UserOrganizations"."CreatedAt" INTO _Before FROM "dbo"."UserOrganizations"
    WHERE "UserOrganizations"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserOrganizations"."UserUUID" = "test"."Fixture"('User.Member');

    SELECT * INTO _Member FROM "dbo"."SetOrganizationRole"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'), true);
    PERFORM "test"."AssertEquals"(_Member."JoinedAt", _Before, 'promoting a member changed when they joined');
END;
$$ LANGUAGE plpgsql;

-- Promoting somebody is not a way to read an address they have withheld: the
-- row this answers with is the one dbo.GetOrganizationMembers would return.
CREATE FUNCTION "test"."TestSetOrganizationRole_WithholdsAPrivateAddressFromTheRowItAnswersWith" () RETURNS void AS $$
DECLARE
    _Promoted record;
BEGIN
    PERFORM "dbo"."SetUserEmailPrivacy"('member', true);

    SELECT * INTO _Promoted FROM "dbo"."SetOrganizationRole"(
        'owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'), true
    ) AS "Members";

    PERFORM "test"."AssertEquals"(_Promoted."Email"::text, '', 'promoting a member handed over an address they had withheld');
    PERFORM "test"."AssertTrue"(_Promoted."IsOwner", 'the member was not promoted');
END;
$$ LANGUAGE plpgsql;
