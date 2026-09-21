CREATE FUNCTION "test"."TestLeaveTeam_RemovesTheUser" () RETURNS void AS $$
DECLARE
    _Result record;
BEGIN
    SELECT * INTO _Result FROM "dbo"."LeaveTeam"('owner', "test"."Fixture"('Team.Core'), "test"."Fixture"('User.Member'));

    PERFORM "test"."AssertFalse"(
        "dbo"."IsMemberOfTeam"('member', "test"."Fixture"('Team.Core')),
        'the user was not removed from the team'
    );
    PERFORM "test"."AssertEquals"(_Result."UserCount", 1, 'only the owner should be left on the core team');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestLeaveTeam_OnlyTouchesTheNamedTeam" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."LeaveTeam"('owner', "test"."Fixture"('Team.Core'), "test"."Fixture"('User.Member'));
    PERFORM "test"."AssertTrue"(
        "dbo"."IsMemberOfTeam"('member', "test"."Fixture"('Team.Support')),
        'leaving one team also dropped membership of another'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestLeaveTeam_LeavesOrganizationMembershipAlone" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."LeaveTeam"('member', "test"."Fixture"('Team.Core'), "test"."Fixture"('User.Member'));
    PERFORM "test"."AssertTrue"(
        "dbo"."IsMemberOfOrganization"('member', "test"."Fixture"('Organization.Acme')),
        'leaving a team also removed the user from the organization'
    );
END;
$$ LANGUAGE plpgsql;

-- KNOWN ISSUE: like JoinTeam, LeaveTeam performs no authorisation check, so
-- any caller can remove any user from any team.
CREATE FUNCTION "test"."TestLeaveTeam_AllowsAnyCaller_KnownIssue" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."LeaveTeam"('outsider', "test"."Fixture"('Team.Core'), "test"."Fixture"('User.Member'));
    PERFORM "test"."AssertFalse"(
        "dbo"."IsMemberOfTeam"('member', "test"."Fixture"('Team.Core')),
        'LeaveTeam now refuses unauthorised callers -- replace this test with the rejection case'
    );
END;
$$ LANGUAGE plpgsql;
