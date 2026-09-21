--
-- Badge groups, their badges, and optionally how far a user has got through
-- each one. Absorbs GetBadgeGroups and GetBadgeGroupProgress.
--
-- GetBadgeGroupProgress read a BadgeGroupAssociations table that never existed
-- under that name; dbo.BadgeGroupRelationships is what it meant. It also
-- counted rows in dbo.UserBadges without checking they were earned, so a badge
-- in progress counted as complete. Only earned, unrevoked badges count here.
--
CREATE FUNCTION "dbo"."GetBadgeGroups" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _UserUUID uuid DEFAULT NULL
) RETURNS TABLE(
    "BadgeGroupUUID" uuid,
    "Name" varchar(64),
    "Description" text,
    "TotalBadges" bigint,
    "EarnedBadges" bigint
) AS $$
    DECLARE
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
        _Subject uuid = COALESCE(_UserUUID, "dbo"."GetUserUUID"(_LoginName));
    BEGIN
        RETURN QUERY
        SELECT
            "BadgeGroups"."BadgeGroupUUID",
            "BadgeGroups"."Name",
            "BadgeGroups"."Description",
            count("BadgeGroupRelationships"."BadgeUUID"),
            count("UserBadges"."BadgeUUID")
        FROM
            "dbo"."BadgeGroups"
            LEFT JOIN "dbo"."BadgeGroupRelationships" ON ("BadgeGroupRelationships"."BadgeGroupUUID" = "BadgeGroups"."BadgeGroupUUID")
            LEFT JOIN "dbo"."UserBadges" ON (
                "UserBadges"."BadgeUUID" = "BadgeGroupRelationships"."BadgeUUID" AND
                "UserBadges"."UserUUID" = _Subject AND
                "UserBadges"."OrganizationUUID" = _OrganizationUUID AND
                "UserBadges"."EarnedAt" IS NOT NULL AND
                "UserBadges"."RevokedAt" IS NULL
            )
        WHERE
            _IsMemberOfOrganization = true
        GROUP BY "BadgeGroups"."BadgeGroupUUID", "BadgeGroups"."Name", "BadgeGroups"."Description"
        ORDER BY "BadgeGroups"."Name";
    END;
$$ LANGUAGE plpgsql;
