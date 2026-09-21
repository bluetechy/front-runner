CREATE FUNCTION "dbo"."GetOrganizations" (_LoginName varchar(64)) RETURNS TABLE(
    "OrganizationUUID" uuid,
    "Name" VARCHAR(64),
    "TeamCount" INTEGER,
    "UserCount" INTEGER,
    "OwnerCount" INTEGER,
    "IsOwner" BOOLEAN
) AS $$
    DECLARE
        _UserUUID uuid = "dbo"."GetUserUUID"(_LoginName);
    BEGIN
        RETURN QUERY
        SELECT
            "Organizations"."OrganizationUUID",
            "Organizations"."Name",
            CAST((SELECT COUNT("Teams"."TeamUUID") FROM "dbo"."Teams" WHERE "Teams"."OrganizationUUID" = "Organizations"."OrganizationUUID" AND "Teams"."IsEnabled" = true) AS INTEGER),
            CAST((SELECT COUNT("Users"."UserUUID") FROM "dbo"."UserOrganizations" LEFT JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID") WHERE "UserOrganizations"."OrganizationUUID" = "Organizations"."OrganizationUUID" AND "Users"."IsEnabled" = true) AS INTEGER),
            CAST((SELECT COUNT("Users"."UserUUID") FROM "dbo"."UserOrganizations" LEFT JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID") WHERE "UserOrganizations"."OrganizationUUID" = "Organizations"."OrganizationUUID" AND "Users"."IsEnabled" = true AND "UserOrganizations"."IsOwner" = true) AS INTEGER),
            "UserOrganizations"."IsOwner"
        FROM
            "dbo"."Organizations"
            LEFT JOIN "dbo"."UserOrganizations" ON ("UserOrganizations"."OrganizationUUID" = "Organizations"."OrganizationUUID")
            LEFT JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID")
        WHERE
            "Organizations"."IsEnabled" = true AND
            "UserOrganizations"."UserUUID" = _UserUUID AND
            "Users"."IsEnabled" = true
        ORDER BY
            "Organizations"."Name" ASC;
    END;
$$ LANGUAGE plpgsql;
