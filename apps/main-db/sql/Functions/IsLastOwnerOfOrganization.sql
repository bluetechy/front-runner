--
-- Is this user the only thing standing between the organization and having no
-- owner at all? True when they own it and no other enabled account does.
--
-- Unlike "dbo"."IsMemberOfOrganization" and "dbo"."IsOwnerOfOrganization",
-- which ask about the *caller* and so take a login name, this asks about a
-- target and takes their UUID. Both callers -- dbo.LeaveOrganization and
-- dbo.SetOrganizationRole -- are acting on somebody else.
--
-- Disabled owners do not count as successors. An account that cannot sign in
-- cannot invite anybody, create a team, or hand ownership on, so leaving an
-- organization to one is the same as leaving it to nobody.
--
-- It deliberately does not care whether the organization is enabled: the rule
-- protects the organization's administration, and a disabled organization
-- still has to be recoverable.
--
CREATE FUNCTION "dbo"."IsLastOwnerOfOrganization" (_OrganizationUUID uuid, _UserUUID uuid) RETURNS boolean AS $$
    BEGIN
        RETURN EXISTS (
            SELECT 1
            FROM "dbo"."UserOrganizations"
            WHERE "UserOrganizations"."OrganizationUUID" = _OrganizationUUID
                AND "UserOrganizations"."UserUUID" = _UserUUID
                AND "UserOrganizations"."IsOwner" = true
        ) AND NOT EXISTS (
            SELECT 1
            FROM "dbo"."UserOrganizations"
                JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID")
            WHERE "UserOrganizations"."OrganizationUUID" = _OrganizationUUID
                AND "UserOrganizations"."UserUUID" != _UserUUID
                AND "UserOrganizations"."IsOwner" = true
                AND "Users"."IsEnabled" = true
        );
    END;
$$ LANGUAGE plpgsql;
