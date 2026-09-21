CREATE FUNCTION "dbo"."JoinOrganization" (_LoginName varchar(64), _OrganizationUUID uuid, _UserUUID uuid) RETURNS TABLE(
    "OrganizationUUID" uuid,
    "Name" varchar(64),
    "TeamCount" integer,
    "UserCount" integer,
    "OwnerCount" integer,
    "IsOwner" boolean
) AS $$
    DECLARE
        _IsOwnerOfOrganization boolean = "dbo"."IsOwnerOfOrganization"(_LoginName, _OrganizationUUID);
    BEGIN
        IF NOT _IsOwnerOfOrganization THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;
        INSERT INTO "dbo"."UserOrganizations" ("UserUUID", "OrganizationUUID", "CreatedBy") VALUES (_UserUUID, _OrganizationUUID, _LoginName) ON CONFLICT ("UserUUID", "OrganizationUUID") DO NOTHING;
        RETURN QUERY
        SELECT
            "Organizations"."OrganizationUUID",
            "Organizations"."Name",
            CAST((SELECT COUNT("Teams"."TeamUUID") FROM "dbo"."Teams" WHERE "Teams"."OrganizationUUID" = "Organizations"."OrganizationUUID" AND "Teams"."IsEnabled" = true) AS INTEGER),
            CAST((SELECT COUNT("Users"."UserUUID") FROM "dbo"."UserOrganizations" LEFT JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID") WHERE "UserOrganizations"."OrganizationUUID" = "Organizations"."OrganizationUUID" AND "Users"."IsEnabled" = true) AS INTEGER),
            CAST((SELECT COUNT("Users"."UserUUID") FROM "dbo"."UserOrganizations" LEFT JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID") WHERE "UserOrganizations"."OrganizationUUID" = "Organizations"."OrganizationUUID" AND "Users"."IsEnabled" = true AND "UserOrganizations"."IsOwner" = true) AS INTEGER),
            _IsOwner
        FROM
            "dbo"."Organizations"
        WHERE
            "Organizations"."OrganizationUUID" = _OrganizationUUID
        LIMIT 1;
    END;
$$ LANGUAGE plpgsql;
