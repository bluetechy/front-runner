CREATE FUNCTION "dbo"."IsOwnerOfOrganization" (_LoginName varchar(64), _OrganizationUUID uuid) RETURNS boolean AS $$
    DECLARE
        _UserUUID uuid = "dbo"."GetUserUUID"(_LoginName);
    BEGIN
    RETURN EXISTS(
        SELECT
            1
        FROM
            "dbo"."UserOrganizations"
        WHERE
            "UserOrganizations"."UserUUID" = _UserUUID AND
            "UserOrganizations"."OrganizationUUID" = _OrganizationUUID AND
            "UserOrganizations"."IsOwner" = true AND
            EXISTS(SELECT 1 FROM "dbo"."Users" WHERE "Users"."UserUUID" = _UserUUID AND "Users"."IsEnabled" = true) AND
            EXISTS(SELECT 1 FROM "dbo"."Organizations" WHERE "Organizations"."OrganizationUUID" = _OrganizationUUID AND "Organizations"."IsEnabled" = true)
    );
    END;
$$ LANGUAGE plpgsql;
