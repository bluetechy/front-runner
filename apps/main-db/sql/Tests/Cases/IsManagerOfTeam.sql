CREATE FUNCTION "test"."TestIsManagerOfTeam_AcceptsTheManager" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertTrue"(
        "dbo"."IsManagerOfTeam"('member', "test"."Fixture"('Team.Core')),
        'the manager of the core team was not recognized'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestIsManagerOfTeam_RejectsAPlainMember" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertFalse"(
        "dbo"."IsManagerOfTeam"('owner', "test"."Fixture"('Team.Core')),
        'a plain team member was treated as a manager'
    );
END;
$$ LANGUAGE plpgsql;

-- Being a manager somewhere is not being a manager everywhere.
CREATE FUNCTION "test"."TestIsManagerOfTeam_IsScopedToOneTeam" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertFalse"(
        "dbo"."IsManagerOfTeam"('member', "test"."Fixture"('Team.Support')),
        'managing the core team also granted management of the support team'
    );
END;
$$ LANGUAGE plpgsql;
