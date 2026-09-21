CREATE FUNCTION "test"."TestIsMemberOfTeam_AcceptsAMember" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertTrue"(
        "dbo"."IsMemberOfTeam"('member', "test"."Fixture"('Team.Core')),
        'a member of the core team was not recognised'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestIsMemberOfTeam_RejectsANonMember" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertFalse"(
        "dbo"."IsMemberOfTeam"('outsider', "test"."Fixture"('Team.Core')),
        'a non-member passed the team membership check'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestIsMemberOfTeam_RejectsADisabledTeam" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertFalse"(
        "dbo"."IsMemberOfTeam"('member', "test"."Fixture"('Team.Archived')),
        'membership of a disabled team still counts'
    );
END;
$$ LANGUAGE plpgsql;
