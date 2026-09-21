--
-- Badges held in this organization whose expiry has passed, or will have by
-- _Before. From CheckExpiredBadges.
--
-- The draft compared every badge's expiry against the argument and returned
-- rows whether or not the holder had actually earned them. Held means earned
-- and not revoked, as everywhere else.
--
CREATE FUNCTION "dbo"."GetExpiredBadges" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _Before timestamp with time zone DEFAULT NULL
) RETURNS TABLE(
    "UserUUID" uuid,
    "UserName" varchar(64),
    "BadgeUUID" uuid,
    "Name" varchar(64),
    "ExpiresAt" timestamp with time zone,
    "EarnedAt" timestamp with time zone
) AS $$
    DECLARE
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
        _Moment timestamp with time zone = COALESCE(_Before, now());
    BEGIN
        RETURN QUERY
        SELECT
            "UserBadges"."UserUUID",
            "Users"."Name",
            "Badges"."BadgeUUID",
            "Badges"."Name",
            "Badges"."ExpiresAt",
            "UserBadges"."EarnedAt"
        FROM
            "dbo"."UserBadges"
            JOIN "dbo"."Badges" ON ("Badges"."BadgeUUID" = "UserBadges"."BadgeUUID")
            JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserBadges"."UserUUID")
        WHERE
            _IsMemberOfOrganization = true AND
            "UserBadges"."OrganizationUUID" = _OrganizationUUID AND
            "UserBadges"."EarnedAt" IS NOT NULL AND
            "UserBadges"."RevokedAt" IS NULL AND
            "Badges"."ExpiresAt" IS NOT NULL AND
            "Badges"."ExpiresAt" <= _Moment
        ORDER BY "Badges"."ExpiresAt", "Users"."Name";
    END;
$$ LANGUAGE plpgsql;
