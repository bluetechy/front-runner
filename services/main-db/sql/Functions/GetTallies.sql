CREATE FUNCTION "dbo"."GetTallies" (_LoginName varchar(64), _OrganizationUUID uuid, _Limit integer) RETURNS TABLE(
    "OrganizationUUID" uuid,
    "UserUUID" uuid,
    "Name" varchar(64),
    "PointUUID" uuid,
    "Amount" decimal(19,4)
) AS $$
    DECLARE
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
    BEGIN
        IF _Limit = 0 THEN
            RETURN QUERY
            SELECT
                "UserTallies"."OrganizationUUID",
                "UserTallies"."UserUUID",
                "Users"."Name",
                "UserTallies"."PointUUID",
                "UserTallies"."Amount"
            FROM
                "dbo"."UserTallies"
                LEFT JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserTallies"."UserUUID")
            WHERE
                _IsMemberOfOrganization = true AND
                "UserTallies"."OrganizationUUID" = _OrganizationUUID AND
                "Users"."IsEnabled" = true;
        ELSE
            RETURN QUERY
            SELECT
                "UserTallies"."OrganizationUUID",
                "UserTallies"."UserUUID",
                "Users"."Name",
                "UserTallies"."PointUUID",
                "UserTallies"."Amount"
            FROM
                "dbo"."UserTallies"
                LEFT JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserTallies"."UserUUID")
            WHERE
                _IsMemberOfOrganization = true AND
                "UserTallies"."OrganizationUUID" = _OrganizationUUID AND
                "Users"."IsEnabled" = true
                LIMIT (_Limit);
        END IF;
    END;
$$ LANGUAGE plpgsql;
