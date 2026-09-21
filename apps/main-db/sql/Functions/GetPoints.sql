CREATE FUNCTION "dbo"."GetPoints" (_LoginName varchar(64), _OrganizationUUID uuid) RETURNS TABLE(
    "UserPointUUID" uuid,
    "UserUUID" uuid,
    "OrganizationUUID" uuid,
    "PointUUID" uuid,
    "Name" varchar(64),
    "Description" text,
    "Amount" decimal(19,4),
    "ExpiresAt" timestamp with time zone
) AS $$
    DECLARE
        _UserUUID uuid = "dbo"."GetUserUUID"(_LoginName);
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
    BEGIN
        RETURN QUERY
        SELECT
            "UserPoints"."UserPointUUID",
            "UserPoints"."UserUUID",
            "UserPoints"."OrganizationUUID",
            "UserPoints"."PointUUID",
            "Points"."Name",
            "UserPoints"."Description",
            "UserPoints"."Amount",
            "UserPoints"."ExpiresAt"
        FROM
            "dbo"."UserPoints"
            LEFT JOIN "dbo"."Points" ON ("Points"."PointUUID" = "UserPoints"."PointUUID")
        WHERE
            _IsMemberOfOrganization = true AND
            "UserPoints"."UserUUID" = _UserUUID AND
            "UserPoints"."OrganizationUUID" = _OrganizationUUID;
    END;
$$ LANGUAGE plpgsql;
