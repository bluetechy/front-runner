--
-- Note on probes: IsMemberOfTeam and IsManagerOfTeam both require the user to
-- be a member of the team's *organization* as well as the team, so they are
-- not usable to check that an outsider was added to a team. Those cases read
-- dbo.UserTeams directly.
--

CREATE FUNCTION "test"."TestJoinTeam_AddsTheUser" () RETURNS void AS $$
DECLARE
    _Result record;
    _Count bigint;
BEGIN
    SELECT * INTO _Result FROM "dbo"."JoinTeam"('owner', "test"."Fixture"('Team.Core'), "test"."Fixture"('User.Outsider'));

    SELECT count(*) INTO _Count FROM "dbo"."UserTeams"
    WHERE "UserTeams"."TeamUUID" = "test"."Fixture"('Team.Core')
        AND "UserTeams"."UserUUID" = "test"."Fixture"('User.Outsider');
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'the user was not added to the team');

    PERFORM "test"."AssertEquals"(_Result."UserCount", 3, 'the user count should include the newly added member');
    PERFORM "test"."AssertFalse"(_Result."IsManager", 'joining a team should not make the user a manager by default');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestJoinTeam_CanGrantManagement" () RETURNS void AS $$
DECLARE
    _IsManager boolean;
BEGIN
    PERFORM "dbo"."JoinTeam"('owner', "test"."Fixture"('Team.Core'), "test"."Fixture"('User.Outsider'), true);

    SELECT "UserTeams"."IsManager" INTO _IsManager FROM "dbo"."UserTeams"
    WHERE "UserTeams"."TeamUUID" = "test"."Fixture"('Team.Core')
        AND "UserTeams"."UserUUID" = "test"."Fixture"('User.Outsider');
    PERFORM "test"."AssertTrue"(_IsManager, 'JoinTeam ignored _IsManager => true');
END;
$$ LANGUAGE plpgsql;

-- JoinTeam re-runs as an upsert, so it doubles as "change this member's
-- manager flag". The owner is already on the core team as a plain member, so
-- this promotes rather than inserts -- and because they are in the
-- organization too, IsManagerOfTeam can confirm it end to end.
CREATE FUNCTION "test"."TestJoinTeam_UpdatesAnExistingMembership" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    PERFORM "dbo"."JoinTeam"('owner', "test"."Fixture"('Team.Core'), "test"."Fixture"('User.Owner'), true);

    SELECT count(*) INTO _Count FROM "dbo"."UserTeams"
    WHERE "UserTeams"."TeamUUID" = "test"."Fixture"('Team.Core')
        AND "UserTeams"."UserUUID" = "test"."Fixture"('User.Owner');
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'rejoining a team created a second membership row');
    PERFORM "test"."AssertTrue"(
        "dbo"."IsManagerOfTeam"('owner', "test"."Fixture"('Team.Core')),
        'rejoining with _IsManager => true did not promote the existing member'
    );
END;
$$ LANGUAGE plpgsql;

-- KNOWN ISSUE: JoinTeam has no authorisation check at all, where its sibling
-- JoinOrganization requires IsOwnerOfOrganization. Anyone can add anyone to
-- any team and hand them the manager flag while doing it.
CREATE FUNCTION "test"."TestJoinTeam_AllowsAnyCaller_KnownIssue" () RETURNS void AS $$
DECLARE
    _IsManager boolean;
BEGIN
    PERFORM "dbo"."JoinTeam"('outsider', "test"."Fixture"('Team.Core'), "test"."Fixture"('User.Outsider'), true);

    SELECT "UserTeams"."IsManager" INTO _IsManager FROM "dbo"."UserTeams"
    WHERE "UserTeams"."TeamUUID" = "test"."Fixture"('Team.Core')
        AND "UserTeams"."UserUUID" = "test"."Fixture"('User.Outsider');
    PERFORM "test"."AssertTrue"(_IsManager, 'JoinTeam now refuses unauthorised callers -- replace this test with the rejection case');
END;
$$ LANGUAGE plpgsql;

-- KNOWN ISSUE: JoinTeam does not require the user to belong to the team's
-- organization, so it can create a team membership that every read function
-- then ignores -- the row exists but IsMemberOfTeam says no. Either JoinTeam
-- should reject it or it should add the organization membership too.
CREATE FUNCTION "test"."TestJoinTeam_CreatesUnreachableMembershipsForOutsiders_KnownIssue" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    PERFORM "dbo"."JoinTeam"('owner', "test"."Fixture"('Team.Core'), "test"."Fixture"('User.Outsider'));

    SELECT count(*) INTO _Count FROM "dbo"."UserTeams"
    WHERE "UserTeams"."TeamUUID" = "test"."Fixture"('Team.Core')
        AND "UserTeams"."UserUUID" = "test"."Fixture"('User.Outsider');
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'the membership row was not written');

    PERFORM "test"."AssertFalse"(
        "dbo"."IsMemberOfTeam"('outsider', "test"."Fixture"('Team.Core')),
        'JoinTeam now keeps team and organization membership consistent -- replace this test'
    );
END;
$$ LANGUAGE plpgsql;
