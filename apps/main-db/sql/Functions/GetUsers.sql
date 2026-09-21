CREATE FUNCTION "dbo"."GetUsers" (_LoginName varchar(64)) RETURNS TABLE(
    "UserUUID" uuid,
    "Name" varchar(64),
    "LoginName" varchar(64),
    "Email" varchar(255),
    "IsAdmin" boolean
) AS $$
    BEGIN
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
            "Users"."IsEnabled" = true AND
            _LoginName = 'admin'
        ORDER BY
            "Users"."Name" ASC;
    END;
$$ LANGUAGE plpgsql;
