CREATE FUNCTION "test"."TestLeaveOrganization_LetsAnOwnerRemoveAMember" () RETURNS void AS $$
DECLARE
    _Result record;
BEGIN
    SELECT * INTO _Result FROM "dbo"."LeaveOrganization"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'));

    PERFORM "test"."AssertFalse"(
        "dbo"."IsMemberOfOrganization"('member', "test"."Fixture"('Organization.Acme')),
        'the member was not removed from the organization'
    );
    PERFORM "test"."AssertEquals"(_Result."UserCount", 1, 'only the owner should be left');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestLeaveOrganization_LetsAUserRemoveThemselves" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."LeaveOrganization"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'));
    PERFORM "test"."AssertFalse"(
        "dbo"."IsMemberOfOrganization"('member', "test"."Fixture"('Organization.Acme')),
        'a member could not leave an organization on their own'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestLeaveOrganization_RejectsRemovingSomebodyElse" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."LeaveOrganization"(%L, %L, %L)',
            'member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Owner')
        ),
        'a plain member was allowed to remove the owner',
        'Action cannot be performed.'
    );
    PERFORM "test"."AssertTrue"(
        "dbo"."IsOwnerOfOrganization"('owner', "test"."Fixture"('Organization.Acme')),
        'the rejected call still removed the owner'
    );
END;
$$ LANGUAGE plpgsql;

-- The delete is scoped to one organization: leaving the disabled organization
-- must not also drop the caller's membership of Acme. Owner leaves the
-- disabled one rather than Acme because Admin co-owns it -- Owner is the only
-- owner Acme has, and the guard below refuses to take them out of it.
CREATE FUNCTION "test"."TestLeaveOrganization_OnlyTouchesTheNamedOrganization" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    PERFORM "dbo"."LeaveOrganization"('owner', "test"."Fixture"('Organization.Disabled'), "test"."Fixture"('User.Owner'));

    SELECT count(*) INTO _Count FROM "dbo"."UserOrganizations"
    WHERE "UserOrganizations"."UserUUID" = "test"."Fixture"('User.Owner')
        AND "UserOrganizations"."OrganizationUUID" = "test"."Fixture"('Organization.Acme');
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'leaving one organization also dropped membership of another');
END;
$$ LANGUAGE plpgsql;

-- An organization with no owner has nobody who can invite, create teams, or
-- hand ownership on. The last owner is held in place rather than allowed to
-- walk out of it.
CREATE FUNCTION "test"."TestLeaveOrganization_RefusesToRemoveTheLastOwner" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."LeaveOrganization"(%L, %L, %L)',
            'owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Owner')
        ),
        'the only owner was allowed to leave the organization',
        'The last owner cannot leave the organization.'
    );
    PERFORM "test"."AssertTrue"(
        "dbo"."IsOwnerOfOrganization"('owner', "test"."Fixture"('Organization.Acme')),
        'the rejected call still removed the owner'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestLeaveOrganization_LetsAnOwnerLeaveWhenAnotherRemains" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    PERFORM "dbo"."LeaveOrganization"('owner', "test"."Fixture"('Organization.Disabled'), "test"."Fixture"('User.Owner'));

    SELECT count(*) INTO _Count FROM "dbo"."UserOrganizations"
    WHERE "UserOrganizations"."UserUUID" = "test"."Fixture"('User.Owner')
        AND "UserOrganizations"."OrganizationUUID" = "test"."Fixture"('Organization.Disabled');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'an owner could not leave an organization that has another owner');
END;
$$ LANGUAGE plpgsql;

-- An account that cannot sign in cannot administer anything, so a disabled
-- owner is not a successor and does not release the last enabled one.
CREATE FUNCTION "test"."TestLeaveOrganization_DoesNotCountADisabledOwnerAsASuccessor" () RETURNS void AS $$
BEGIN
    UPDATE "dbo"."UserOrganizations" SET "IsOwner" = true, "UpdatedBy" = 'test'
    WHERE "UserOrganizations"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserOrganizations"."UserUUID" = "test"."Fixture"('User.Disabled');

    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."LeaveOrganization"(%L, %L, %L)',
            'owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Owner')
        ),
        'a disabled owner was treated as a successor to the last enabled one',
        'The last owner cannot leave the organization.'
    );
END;
$$ LANGUAGE plpgsql;

-- A plain member is not an owner, so the guard has nothing to say about them
-- however few owners the organization has.
CREATE FUNCTION "test"."TestLeaveOrganization_StillRemovesAPlainMemberFromASingleOwnerOrganization" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."LeaveOrganization"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'));
    PERFORM "test"."AssertFalse"(
        "dbo"."IsMemberOfOrganization"('member', "test"."Fixture"('Organization.Acme')),
        'the last-owner guard blocked a plain member from leaving'
    );
END;
$$ LANGUAGE plpgsql;
