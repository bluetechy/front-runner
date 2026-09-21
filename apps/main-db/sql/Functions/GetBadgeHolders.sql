--
-- Who in this organization holds a badge.
--
-- GetUsersWithBadge and GetBadgeOwners were byte-identical bodies under two
-- names -- a duplicate pair the earlier passes did not catch. This is both.
--
-- Same rule as dbo.GetBadges: in progress and revoked do not count as holding.
--
CREATE FUNCTION "dbo"."GetBadgeHolders" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _BadgeUUID uuid
) RETURNS TABLE(
    "UserUUID" uuid,
    "Name" varchar(64),
    "LoginName" varchar(64),
    "EarnedAt" timestamp with time zone
) AS $$
    DECLARE
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
    BEGIN
        RETURN QUERY
        SELECT
            "Users"."UserUUID",
            "Users"."Name",
            "Users"."LoginName",
            "UserBadges"."EarnedAt"
        FROM
            "dbo"."UserBadges"
            JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserBadges"."UserUUID")
        WHERE
            _IsMemberOfOrganization = true AND
            "UserBadges"."BadgeUUID" = _BadgeUUID AND
            "UserBadges"."OrganizationUUID" = _OrganizationUUID AND
            "UserBadges"."EarnedAt" IS NOT NULL AND
            "UserBadges"."RevokedAt" IS NULL AND
            "Users"."IsEnabled" = true
        ORDER BY "UserBadges"."EarnedAt" DESC, "Users"."Name";
    END;
$$ LANGUAGE plpgsql;
