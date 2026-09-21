--
-- Rename an organization. Owners only, and the only thing that has ever
-- written dbo.Organizations after dbo.AddOrganization created the row.
--
-- Renaming only. Archiving is dbo.SetOrganizationEnabled, which is separate
-- because it needs an ownership check that survives the organization being
-- archived -- dbo.IsOwnerOfOrganization, used here, refuses a disabled one.
--
CREATE FUNCTION "dbo"."RenameOrganization" (_LoginName varchar(64), _OrganizationUUID uuid, _Name varchar(64)) RETURNS TABLE(
    "OrganizationUUID" uuid,
    "Name" varchar(64),
    "TeamCount" integer,
    "UserCount" integer,
    "OwnerCount" integer,
    "IsOwner" boolean,
    "IsEnabled" boolean
) AS $$
    BEGIN
        IF NOT "dbo"."IsOwnerOfOrganization"(_LoginName, _OrganizationUUID) THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;
        IF _Name IS NULL OR btrim(_Name) = '' THEN
            RAISE EXCEPTION 'A name is required.';
        END IF;

        UPDATE "dbo"."Organizations" SET
            "Name" = btrim(_Name),
            "UpdatedBy" = _LoginName
        WHERE "Organizations"."OrganizationUUID" = _OrganizationUUID;

        RETURN QUERY
        SELECT
            "Organizations"."OrganizationUUID",
            "Organizations"."Name",
            CAST((SELECT COUNT("Teams"."TeamUUID") FROM "dbo"."Teams" WHERE "Teams"."OrganizationUUID" = "Organizations"."OrganizationUUID" AND "Teams"."IsEnabled" = true) AS INTEGER),
            CAST((SELECT COUNT("Users"."UserUUID") FROM "dbo"."UserOrganizations" LEFT JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID") WHERE "UserOrganizations"."OrganizationUUID" = "Organizations"."OrganizationUUID" AND "Users"."IsEnabled" = true) AS INTEGER),
            CAST((SELECT COUNT("Users"."UserUUID") FROM "dbo"."UserOrganizations" LEFT JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID") WHERE "UserOrganizations"."OrganizationUUID" = "Organizations"."OrganizationUUID" AND "Users"."IsEnabled" = true AND "UserOrganizations"."IsOwner" = true) AS INTEGER),
            (SELECT "UserOrganizations"."IsOwner" FROM "dbo"."UserOrganizations" WHERE "UserOrganizations"."OrganizationUUID" = _OrganizationUUID AND "UserOrganizations"."UserUUID" = "dbo"."GetUserUUID"(_LoginName)),
            COALESCE("Organizations"."IsEnabled", false)
        FROM
            "dbo"."Organizations"
        WHERE
            "Organizations"."OrganizationUUID" = _OrganizationUUID
        LIMIT 1;
    END;
$$ LANGUAGE plpgsql;
