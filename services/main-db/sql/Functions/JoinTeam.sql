CREATE FUNCTION "dbo"."JoinTeam" (_LoginName varchar(64), _TeamUUID uuid, _UserUUID uuid, _IsManager boolean DEFAULT false) RETURNS TABLE(
    "OrganizationUUID" uuid,
    "TeamUUID" uuid,
    "Name" varchar(64),
    "UserCount" integer,
    "IsManager" boolean
) AS $$
    BEGIN
        INSERT INTO "dbo"."UserTeams" ("UserUUID", "TeamUUID", "CreatedBy") VALUES (_UserUUID, _TeamUUID, _LoginName) ON CONFLICT ("UserUUID", "TeamUUID") DO NOTHING;
        UPDATE "dbo"."UserTeams" SET "IsManager" = _IsManager, "UpdatedBy" = _LoginName WHERE "UserUUID" = _UserUUID AND "TeamUUID" = _TeamUUID;
        RETURN QUERY
        SELECT
            "Teams"."OrganizationUUID",
            "Teams"."TeamUUID",
            "Teams"."Name",
            CAST((SELECT COUNT("Users"."UserUUID") FROM "dbo"."UserTeams" LEFT JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserTeams"."UserUUID") WHERE "UserTeams"."TeamUUID" = "Teams"."TeamUUID" AND "Users"."IsEnabled" = true) AS INTEGER),
            _IsManager
        FROM
            "dbo"."Teams"
        WHERE
            "Teams"."TeamUUID" = _TeamUUID
        LIMIT 1;
    END;
$$ LANGUAGE plpgsql;
