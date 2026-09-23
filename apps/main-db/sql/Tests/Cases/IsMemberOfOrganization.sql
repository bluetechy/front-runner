CREATE FUNCTION "test"."TestIsMemberOfOrganization_AcceptsAMember" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertTrue"(
        "dbo"."IsMemberOfOrganization"('member', "test"."Fixture"('Organization.Acme')),
        'a member of Acme was not recognized'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestIsMemberOfOrganization_RejectsAnOutsider" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertFalse"(
        "dbo"."IsMemberOfOrganization"('outsider', "test"."Fixture"('Organization.Acme')),
        'a user who belongs to no organization passed the membership check'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestIsMemberOfOrganization_RejectsADisabledUser" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertFalse"(
        "dbo"."IsMemberOfOrganization"('disabled', "test"."Fixture"('Organization.Acme')),
        'a disabled user still counts as a member'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestIsMemberOfOrganization_RejectsADisabledOrganization" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertFalse"(
        "dbo"."IsMemberOfOrganization"('owner', "test"."Fixture"('Organization.Disabled')),
        'membership of a disabled organization still counts'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestIsMemberOfOrganization_RejectsAnUnknownLogin" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertFalse"(
        "dbo"."IsMemberOfOrganization"('nobody', "test"."Fixture"('Organization.Acme')),
        'an unknown login passed the membership check'
    );
END;
$$ LANGUAGE plpgsql;
