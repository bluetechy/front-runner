CREATE FUNCTION "test"."TestIsOwnerOfOrganization_AcceptsTheOwner" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertTrue"(
        "dbo"."IsOwnerOfOrganization"('owner', "test"."Fixture"('Organization.Acme')),
        'the owner of Acme was not recognised'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestIsOwnerOfOrganization_RejectsAPlainMember" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertFalse"(
        "dbo"."IsOwnerOfOrganization"('member', "test"."Fixture"('Organization.Acme')),
        'a plain member was treated as an owner'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestIsOwnerOfOrganization_RejectsADisabledOrganization" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertFalse"(
        "dbo"."IsOwnerOfOrganization"('owner', "test"."Fixture"('Organization.Disabled')),
        'ownership of a disabled organization still counts'
    );
END;
$$ LANGUAGE plpgsql;
