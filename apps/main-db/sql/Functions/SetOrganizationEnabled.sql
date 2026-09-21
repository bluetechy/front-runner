--
-- Archive an organization, or bring it back. Owners only.
--
-- Disabling is not deleting and nothing is removed: memberships, teams, badges
-- and point rows all stay exactly as they were, and every read function starts
-- filtering the organization out. Re-enabling puts it all back.
--
-- Ownership is read straight from dbo.UserOrganizations rather than through
-- dbo.IsOwnerOfOrganization, which also requires the organization to be
-- enabled. Going through the helper would mean an owner could archive an
-- organization and then have no standing to restore it -- the check has to
-- outlive the thing it is checking.
--
-- dbo.GetOrganizations(_LoginName, true) and dbo.GetOrganization are how an
-- owner finds an archived organization again.
--
CREATE FUNCTION "dbo"."SetOrganizationEnabled" (_LoginName varchar(64), _OrganizationUUID uuid, _IsEnabled boolean) RETURNS TABLE(
    "OrganizationUUID" uuid,
    "Name" varchar(64),
    "TeamCount" integer,
    "UserCount" integer,
    "OwnerCount" integer,
    "IsOwner" boolean,
    "IsEnabled" boolean
) AS $$
    DECLARE
        _UserUUID uuid = "dbo"."GetUserUUID"(_LoginName);
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM "dbo"."UserOrganizations"
                JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID")
            WHERE "UserOrganizations"."OrganizationUUID" = _OrganizationUUID
                AND "UserOrganizations"."UserUUID" = _UserUUID
                AND "UserOrganizations"."IsOwner" = true
                AND "Users"."IsEnabled" = true
        ) THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        UPDATE "dbo"."Organizations" SET
            "IsEnabled" = _IsEnabled,
            "UpdatedBy" = _LoginName
        WHERE "Organizations"."OrganizationUUID" = _OrganizationUUID;

        RETURN QUERY SELECT * FROM "dbo"."GetOrganization"(_LoginName, _OrganizationUUID);
    END;
$$ LANGUAGE plpgsql;
