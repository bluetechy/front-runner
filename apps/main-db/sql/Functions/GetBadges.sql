--
-- Badges a user holds. Defaults to the caller; pass _UserUUID to look at
-- somebody else in the same organization.
--
-- A dbo.UserBadges row is not proof of holding one: "EarnedAt" is NULL while
-- the badge is still in progress and "RevokedAt" is set when it is taken back.
-- Both are excluded here.
--
-- The optional arguments absorb three drafts. GetUserBadges was this function
-- for a named user; GetRecentlyEarnedBadges was this ordering with a limit,
-- which is now the default order; GetUserRareBadges was _Rarity = 'Rare'.
--
CREATE FUNCTION "dbo"."GetBadges" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _UserUUID uuid DEFAULT NULL,
    _Rarity varchar(20) DEFAULT NULL,
    _RowLimit integer DEFAULT NULL
) RETURNS TABLE(
    "UserUUID" uuid,
    "OrganizationUUID" uuid,
    "BadgeUUID" uuid,
    "Name" varchar(64),
    "Description" text,
    "Level" integer,
    "Rarity" varchar(20),
    "EarnedAt" timestamp with time zone,
    "EarnedDescription" text
) AS $$
    DECLARE
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
        _Subject uuid = COALESCE(_UserUUID, "dbo"."GetUserUUID"(_LoginName));
    BEGIN
        RETURN QUERY
        SELECT
            "UserBadges"."UserUUID",
            "UserBadges"."OrganizationUUID",
            "UserBadges"."BadgeUUID",
            "Badges"."Name",
            "Badges"."Description",
            "Badges"."Level",
            "Badges"."Rarity",
            "UserBadges"."EarnedAt",
            "UserBadges"."EarnedDescription"
        FROM
            "dbo"."UserBadges"
            LEFT JOIN "dbo"."Badges" ON ("Badges"."BadgeUUID" = "UserBadges"."BadgeUUID")
        WHERE
            _IsMemberOfOrganization = true AND
            "UserBadges"."UserUUID" = _Subject AND
            "UserBadges"."OrganizationUUID" = _OrganizationUUID AND
            "UserBadges"."EarnedAt" IS NOT NULL AND
            "UserBadges"."RevokedAt" IS NULL AND
            "Badges"."IsEnabled" = true AND
            (_Rarity IS NULL OR "Badges"."Rarity" = _Rarity)
        ORDER BY "UserBadges"."EarnedAt" DESC
        LIMIT (CASE WHEN COALESCE(_RowLimit, 0) > 0 THEN _RowLimit ELSE NULL END);
    END;
$$ LANGUAGE plpgsql;
