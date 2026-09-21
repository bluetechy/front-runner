--
-- Badges this user actually holds. A dbo.UserBadges row is not proof of that
-- any more: "EarnedAt" is NULL while the badge is still in progress, and
-- "RevokedAt" is set when one is taken back. Both are excluded here.
--
CREATE FUNCTION "dbo"."GetBadges" (_LoginName varchar(64), _OrganizationUUID uuid) RETURNS TABLE(
    "UserUUID" uuid,
    "OrganizationUUID" uuid,
    "BadgeUUID" uuid,
    "Name" varchar(64),
    "Description" text,
    "Level" integer,
    "EarnedAt" timestamp with time zone,
    "EarnedDescription" text
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
            "Badges"."Level",
            "UserBadges"."EarnedAt",
            "UserBadges"."EarnedDescription"
        FROM
            "dbo"."UserBadges"
            LEFT JOIN "dbo"."Badges" ON ("Badges"."BadgeUUID" = "UserBadges"."BadgeUUID")
        WHERE
            _IsMemberOfOrganization = true AND
            "UserBadges"."UserUUID" = _UserUUID AND
            "UserBadges"."OrganizationUUID" = _OrganizationUUID AND
            "UserBadges"."EarnedAt" IS NOT NULL AND
            "UserBadges"."RevokedAt" IS NULL AND
            "Badges"."IsEnabled" = true;
    END;
$$ LANGUAGE plpgsql;
