CREATE FUNCTION "dbo"."LeaveTeam" (_LoginName varchar(64), _TeamUUID uuid, _UserUUID uuid) RETURNS TABLE(
    "OrganizationUUID" uuid,
    "TeamUUID" uuid,
    "Name" varchar(64),
    "UserCount" integer,
    "IsManager" boolean
) AS $$
    BEGIN
        DELETE FROM "dbo"."UserTeams" WHERE "UserTeams"."TeamUUID" = _TeamUUID AND "UserTeams"."UserUUID" = _UserUUID;
        RETURN QUERY
        SELECT
            "Teams"."OrganizationUUID",
            "Teams"."TeamUUID",
            "Teams"."Name",
            CAST((SELECT COUNT("Users"."UserUUID") FROM "dbo"."UserTeams" LEFT JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserTeams"."UserUUID") WHERE "UserTeams"."TeamUUID" = "Teams"."TeamUUID" AND "Users"."IsEnabled" = true) AS INTEGER),
            false
        FROM
            "dbo"."Teams"
        WHERE
                "Teams"."TeamUUID" = _TeamUUID
        LIMIT 1;
    END;
$$ LANGUAGE plpgsql;
