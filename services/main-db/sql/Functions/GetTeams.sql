CREATE FUNCTION "dbo"."GetTeams" (_LoginName varchar(64), _OrganizationUUID uuid) RETURNS TABLE(
    "OrganizationUUID" uuid,
    "TeamUUID" uuid,
    "Name" VARCHAR(64),
    "UserCount" INTEGER,
    "IsManager" BOOLEAN
) AS $$
    DECLARE
        _UserUUID uuid = "dbo"."GetUserUUID"(_LoginName);
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
    BEGIN
        RETURN QUERY
        SELECT
            "Teams"."OrganizationUUID",
            "Teams"."TeamUUID",
            "Teams"."Name",
            CAST((SELECT COUNT("Users"."UserUUID") FROM "dbo"."UserTeams" LEFT JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserTeams"."UserUUID") WHERE "UserTeams"."TeamUUID" = "Teams"."TeamUUID" AND "Users"."IsEnabled" = true) AS INTEGER),
            CASE WHEN (SELECT "UserTeams"."UserUUID" FROM "dbo"."UserTeams" WHERE "UserTeams"."UserUUID" = _UserUUID  AND "UserTeams"."TeamUUID" = "Teams"."TeamUUID" AND "UserTeams"."IsManager" = true LIMIT 1) IS NOT NULL THEN true ELSE false END
        FROM
            "dbo"."Teams"
            LEFT JOIN "dbo"."UserTeams" ON ("UserTeams"."TeamUUID" = "Teams"."TeamUUID")
        WHERE
            _IsMemberOfOrganization = true AND
            "Teams"."OrganizationUUID" = _OrganizationUUID AND
            "Teams"."IsEnabled" = true
        ORDER BY
            "Teams"."Name" ASC;
    END;
$$ LANGUAGE plpgsql;
