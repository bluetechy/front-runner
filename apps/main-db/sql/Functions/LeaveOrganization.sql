CREATE FUNCTION "dbo"."LeaveOrganization" (_LoginName varchar(64), _OrganizationUUID uuid, _UserUUID uuid) RETURNS TABLE(
    "OrganizationUUID" uuid,
    "Name" varchar(64),
    "TeamCount" integer,
    "UserCount" integer,
    "OwnerCount" integer,
    "IsOwner" boolean
) AS $$
    DECLARE
        _ActorUUID uuid = "dbo"."GetUserUUID"(_LoginName);
        _IsOwnerOfOrganization boolean = "dbo"."IsOwnerOfOrganization"(_LoginName, _OrganizationUUID);
    BEGIN
        IF NOT _IsOwnerOfOrganization AND _ActorUUID != _UserUUID THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;
        DELETE FROM "dbo"."UserOrganizations" WHERE "UserOrganizations"."OrganizationUUID" = _OrganizationUUID AND "UserOrganizations"."UserUUID" = _UserUUID;
        RETURN QUERY
        SELECT
            "Organizations"."OrganizationUUID",
            "Organizations"."Name",
            CAST((SELECT COUNT("Teams"."TeamUUID") FROM "dbo"."Teams" WHERE "Teams"."OrganizationUUID" = "Organizations"."OrganizationUUID" AND "Teams"."IsEnabled" = true) AS INTEGER),
            CAST((SELECT COUNT("Users"."UserUUID") FROM "dbo"."UserOrganizations" LEFT JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID") WHERE "UserOrganizations"."OrganizationUUID" = "Organizations"."OrganizationUUID" AND "Users"."IsEnabled" = true) AS INTEGER),
            CAST((SELECT COUNT("Users"."UserUUID") FROM "dbo"."UserOrganizations" LEFT JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID") WHERE "UserOrganizations"."OrganizationUUID" = "Organizations"."OrganizationUUID" AND "Users"."IsEnabled" = true AND "UserOrganizations"."IsOwner" = true) AS INTEGER),
            false
        FROM
            "dbo"."Organizations"
        WHERE
            "Organizations"."OrganizationUUID" = _OrganizationUUID
        LIMIT 1;
    END;
$$ LANGUAGE plpgsql;
