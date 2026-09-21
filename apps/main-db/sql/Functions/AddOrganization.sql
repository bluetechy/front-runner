CREATE FUNCTION "dbo"."AddOrganization" (_LoginName varchar(64), _OrganizationName varchar(64), _IsOwner boolean DEFAULT true) RETURNS TABLE(
    "OrganizationUUID" uuid,
    "Name" varchar(64),
    "TeamCount" integer,
    "UserCount" integer,
    "OwnerCount" integer,
    "IsOwner" boolean
) AS $$
    DECLARE
        _UserUUID uuid = "dbo"."GetUserUUID"(_LoginName);
        _OrganizationUUID uuid;
    BEGIN
        INSERT INTO "dbo"."Organizations" ("Name", "CreatedBy") VALUES (_OrganizationName, _LoginName) RETURNING "Organizations"."OrganizationUUID" INTO _OrganizationUUID;
        INSERT INTO "dbo"."UserOrganizations" ("UserUUID", "OrganizationUUID", "IsOwner", "CreatedBy") VALUES (_UserUUID, _OrganizationUUID, _IsOwner, _LoginName);
        RETURN QUERY
        SELECT
            _OrganizationUUID,
            _OrganizationName,
            0,
            1,
            CASE WHEN _IsOwner = true THEN 1 ELSE 0 END,
            _IsOwner;
    END;
$$ LANGUAGE plpgsql;
