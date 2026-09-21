CREATE FUNCTION "test"."TestAddTeam_CreatesTheTeam" () RETURNS void AS $$
DECLARE
    _Result record;
    _Team record;
BEGIN
    SELECT * INTO _Result FROM "dbo"."AddTeam"('owner', "test"."Fixture"('Organization.Acme'), 'New Team');

    PERFORM "test"."AssertEquals"(_Result."Name"::text, 'New Team', 'AddTeam returned the wrong name');
    PERFORM "test"."AssertEquals"(_Result."OrganizationUUID", "test"."Fixture"('Organization.Acme'), 'AddTeam returned the wrong organization');
    PERFORM "test"."AssertEquals"(_Result."UserCount", 0, 'a new team has nobody on it');
    PERFORM "test"."AssertFalse"(_Result."IsManager", 'AddTeam should not claim the creator manages the team');

    SELECT * INTO _Team FROM "dbo"."Teams" WHERE "Teams"."TeamUUID" = _Result."TeamUUID";
    PERFORM "test"."AssertEquals"(_Team."Name"::text, 'New Team', 'AddTeam did not write the team row');
    PERFORM "test"."AssertTrue"(_Team."IsEnabled", 'a new team should be enabled');
    PERFORM "test"."AssertEquals"(_Team."CreatedBy"::text, 'owner', 'AddTeam did not record who created the team');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAddTeam_ShowsUpInGetTeams" () RETURNS void AS $$
DECLARE
    _Result record;
    _Count bigint;
BEGIN
    SELECT * INTO _Result FROM "dbo"."AddTeam"('owner', "test"."Fixture"('Organization.Acme'), 'New Team');

    SELECT count(*) INTO _Count FROM "dbo"."GetTeams"('owner', "test"."Fixture"('Organization.Acme')) AS "Teams"
    WHERE "Teams"."TeamUUID" = _Result."TeamUUID";
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'a team created by AddTeam is not visible to GetTeams');
END;
$$ LANGUAGE plpgsql;
