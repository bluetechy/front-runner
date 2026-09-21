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

-- The delete is scoped to one organization: leaving Acme must not also drop
-- the caller's membership of anything else.
CREATE FUNCTION "test"."TestLeaveOrganization_OnlyTouchesTheNamedOrganization" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    PERFORM "dbo"."LeaveOrganization"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Owner'));

    SELECT count(*) INTO _Count FROM "dbo"."UserOrganizations"
    WHERE "UserOrganizations"."UserUUID" = "test"."Fixture"('User.Owner')
        AND "UserOrganizations"."OrganizationUUID" = "test"."Fixture"('Organization.Disabled');
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'leaving one organization also dropped membership of another');
END;
$$ LANGUAGE plpgsql;
