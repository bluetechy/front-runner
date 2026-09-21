CREATE FUNCTION "dbo"."GetUserUUID" (_LoginName varchar(64)) RETURNS uuid AS $$
    DECLARE
        _UserUUID uuid;
    BEGIN
        SELECT "Users"."UserUUID" INTO _UserUUID FROM "dbo"."Users" WHERE "Users"."LoginName" = _LoginName;
        RETURN _UserUUID;
    END;
$$ LANGUAGE plpgsql;
