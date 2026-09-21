CREATE FUNCTION "dbo"."AddTeam" (_LoginName varchar(64), _OrganizationUUID uuid, _TeamName varchar(64)) RETURNS TABLE(
    "OrganizationUUID" uuid,
    "TeamUUID" uuid,
    "Name" VARCHAR(64),
    "UserCount" INTEGER,
    "IsManager" BOOLEAN
) AS $$
    DECLARE
        _TeamUUID uuid;
    BEGIN
        INSERT INTO "dbo"."Teams" ("OrganizationUUID", "Name", "CreatedBy") VALUES (_OrganizationUUID, _TeamName, _LoginName) RETURNING "Teams"."TeamUUID" INTO _TeamUUID;
        RETURN QUERY
        SELECT
            _OrganizationUUID,
            _TeamUUID,
            _TeamName,
            0,
            false;
    END;
$$ LANGUAGE plpgsql;
