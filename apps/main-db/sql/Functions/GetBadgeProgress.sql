--
-- How far a user is towards each badge that has criteria, as a count and a
-- percentage.
--
-- Four drafts in one. GetBadgeProgress returned a bare integer for one badge;
-- GetUserBadgeProgressSummary was this table; GetNextPotentialBadges was this
-- filtered to unearned with a limit; SuggestBadgesForUser was the same filter
-- with its actual suggestion logic left as a comment.
--
-- Badges with no row in dbo.BadgeCriteria do not appear -- there is nothing to
-- measure progress against.
--
CREATE FUNCTION "dbo"."GetBadgeProgress" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _UserUUID uuid DEFAULT NULL,
    _OnlyUnearned boolean DEFAULT false,
    _RowLimit integer DEFAULT NULL
) RETURNS TABLE(
    "BadgeUUID" uuid,
    "Name" varchar(64),
    "CriteriaDescription" text,
    "CriteriaValue" integer,
    "ProgressCurrent" integer,
    "ProgressPercentage" decimal(5,2),
    "EarnedAt" timestamp with time zone
) AS $$
    DECLARE
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
        _Subject uuid = COALESCE(_UserUUID, "dbo"."GetUserUUID"(_LoginName));
    BEGIN
        RETURN QUERY
        SELECT
            "Badges"."BadgeUUID",
            "Badges"."Name",
            "BadgeCriteria"."Description",
            "BadgeCriteria"."Value",
            COALESCE("UserBadges"."ProgressCurrent", 0),
            (CASE
                WHEN "BadgeCriteria"."Value" > 0
                THEN LEAST(100.00, (COALESCE("UserBadges"."ProgressCurrent", 0) * 100.0) / "BadgeCriteria"."Value")
                ELSE 0
            END)::decimal(5,2),
            "UserBadges"."EarnedAt"
        FROM
            "dbo"."Badges"
            JOIN "dbo"."BadgeCriteria" ON ("BadgeCriteria"."BadgeUUID" = "Badges"."BadgeUUID")
            LEFT JOIN "dbo"."UserBadges" ON (
                "UserBadges"."BadgeUUID" = "Badges"."BadgeUUID" AND
                "UserBadges"."UserUUID" = _Subject AND
                "UserBadges"."OrganizationUUID" = _OrganizationUUID
            )
        WHERE
            _IsMemberOfOrganization = true AND
            "Badges"."IsEnabled" = true AND
            (_OnlyUnearned IS NOT true OR "UserBadges"."EarnedAt" IS NULL)
        ORDER BY "Badges"."Name"
        LIMIT (CASE WHEN COALESCE(_RowLimit, 0) > 0 THEN _RowLimit ELSE NULL END);
    END;
$$ LANGUAGE plpgsql;
