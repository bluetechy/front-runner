CREATE FUNCTION "test"."TestIsLastOwnerOfOrganization_IsTrueForASoleOwner" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertTrue"(
        "dbo"."IsLastOwnerOfOrganization"("test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Owner')),
        'the only owner of Acme was not reported as the last one'
    );
END;
$$ LANGUAGE plpgsql;

-- Admin co-owns the disabled organization, so neither owner is the last one.
CREATE FUNCTION "test"."TestIsLastOwnerOfOrganization_IsFalseWhenAnotherOwnerRemains" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertFalse"(
        "dbo"."IsLastOwnerOfOrganization"("test"."Fixture"('Organization.Disabled'), "test"."Fixture"('User.Owner')),
        'an owner was reported as the last one while another owner remained'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestIsLastOwnerOfOrganization_IsFalseForAPlainMember" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertFalse"(
        "dbo"."IsLastOwnerOfOrganization"("test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member')),
        'a plain member was reported as the last owner'
    );
    PERFORM "test"."AssertFalse"(
        "dbo"."IsLastOwnerOfOrganization"("test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Outsider')),
        'somebody outside the organization was reported as its last owner'
    );
END;
$$ LANGUAGE plpgsql;

-- An account that cannot sign in cannot administer anything, so it does not
-- release the last enabled owner.
CREATE FUNCTION "test"."TestIsLastOwnerOfOrganization_IgnoresDisabledOwners" () RETURNS void AS $$
BEGIN
    UPDATE "dbo"."UserOrganizations" SET "IsOwner" = true, "UpdatedBy" = 'test'
    WHERE "UserOrganizations"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserOrganizations"."UserUUID" = "test"."Fixture"('User.Disabled');

    PERFORM "test"."AssertTrue"(
        "dbo"."IsLastOwnerOfOrganization"("test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Owner')),
        'a disabled owner was counted as a successor'
    );
END;
$$ LANGUAGE plpgsql;

-- The rule protects the organization's administration, and a disabled
-- organization still has to be recoverable, so this does not filter on
-- Organizations."IsEnabled" the way the other Is* functions do.
CREATE FUNCTION "test"."TestIsLastOwnerOfOrganization_AppliesToDisabledOrganizationsToo" () RETURNS void AS $$
BEGIN
    DELETE FROM "dbo"."UserOrganizations"
    WHERE "UserOrganizations"."OrganizationUUID" = "test"."Fixture"('Organization.Disabled')
        AND "UserOrganizations"."UserUUID" = "test"."Fixture"('User.Admin');

    PERFORM "test"."AssertTrue"(
        "dbo"."IsLastOwnerOfOrganization"("test"."Fixture"('Organization.Disabled'), "test"."Fixture"('User.Owner')),
        'the last owner of a disabled organization was not protected'
    );
END;
$$ LANGUAGE plpgsql;
