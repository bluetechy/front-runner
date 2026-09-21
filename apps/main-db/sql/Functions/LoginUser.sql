CREATE FUNCTION "dbo"."LoginUser" (_LoginName varchar(64)) RETURNS TABLE(
    "UserUUID" uuid,
    "Name" varchar(64),
    "LoginName" varchar(64),
    "Email" varchar(255),
    "IsAdmin" boolean
) AS $$
    DECLARE
        _UserUUID uuid;
    BEGIN
        INSERT INTO "dbo"."Users" ("Name", "LoginName", "CreatedBy") VALUES (_LoginName, _LoginName, _LoginName) ON CONFLICT DO NOTHING RETURNING "Users"."UserUUID" INTO _UserUUID;
        RETURN QUERY
        SELECT
            "Users"."UserUUID",
            "Users"."Name",
            "Users"."LoginName",
            "Users"."Email",
            "Users"."IsAdmin"
        FROM
            "dbo"."Users"
        WHERE
            "Users"."LoginName" = _LoginName
        LIMIT 1;
    END;
$$ LANGUAGE plpgsql;
