CREATE FUNCTION "dbo"."GetBadges" (_LoginName varchar(64), _OrganizationUUID uuid) RETURNS TABLE(
    "UserUUID" uuid,
    "OrganizationUUID" uuid,
    "BadgeUUID" uuid,
    "Name" varchar(64),
    "Description" text,
    "Level" integer
) AS $$
    DECLARE
        _UserUUID uuid = "dbo"."GetUserUUID"(_LoginName);
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
    BEGIN
        RETURN QUERY
        SELECT
            "UserBadges"."UserUUID",
            "UserBadges"."OrganizationUUID",
            "UserBadges"."BadgeUUID",
            "Badges"."Name",
            "Badges"."Description",
            "Badges"."Level"
        FROM
            "dbo"."UserBadges"
            LEFT JOIN "dbo"."Badges" ON ("Badges"."BadgeUUID" = "UserBadges"."BadgeUUID")
        WHERE
            _IsMemberOfOrganization = true AND
            "UserBadges"."UserUUID" = _UserUUID AND
            "UserBadges"."OrganizationUUID" = _OrganizationUUID AND
            "Badges"."IsEnabled" = true;
    END;
$$ LANGUAGE plpgsql;
