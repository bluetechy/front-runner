CREATE FUNCTION "dbo"."IsMemberOfTeam" (_LoginName varchar(64), _TeamUUID uuid) RETURNS boolean AS $$
    DECLARE
        _UserUUID uuid = "dbo"."GetUserUUID"(_LoginName);
    BEGIN
        RETURN EXISTS(
            SELECT
                1
            FROM
                "dbo"."UserTeams"
                LEFT JOIN "dbo"."Teams" ON ("Teams"."TeamUUID" = "UserTeams"."TeamUUID")
            WHERE
                "UserTeams"."UserUUID" = _UserUUID AND
                "UserTeams"."TeamUUID" = _TeamUUID AND
                "Teams"."IsEnabled" = true AND
                "dbo"."IsMemberOfOrganization"(_LoginName, "Teams"."OrganizationUUID")
        );
    END;
$$ LANGUAGE plpgsql;
