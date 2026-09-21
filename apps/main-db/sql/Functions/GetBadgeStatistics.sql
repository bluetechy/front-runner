--
-- Per-badge uptake across an organization: who holds it, who is working on it,
-- and how often it has been shared.
--
-- Merges BadgeCompletionAnalytics and BadgeSharingAnalytics, which were two
-- aggregates over the same join.
--
-- Both drafts were wrong in ways worth naming. BadgeCompletionAnalytics
-- divided completions by COUNT(DISTINCT UserId) over dbo.UserBadges, so its
-- "completion rate" was the share of people already holding the badge who hold
-- the badge -- close to 100% by construction. It also joined dbo.BadgeCriteria
-- without grouping by it, so a badge with two criteria counted everyone twice.
-- Here "Holders" is earned-and-unrevoked, "InProgress" is the rest, and the
-- rate is holders over both.
--
-- BadgeSharingAnalytics read a UserSharedBadges table that has never existed;
-- dbo.SharedBadges is what it meant.
--
CREATE FUNCTION "dbo"."GetBadgeStatistics" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _BadgeUUID uuid DEFAULT NULL
) RETURNS TABLE(
    "BadgeUUID" uuid,
    "Name" varchar(64),
    "Holders" bigint,
    "InProgress" bigint,
    "CompletionRate" decimal(5,2),
    "Shares" bigint
) AS $$
    DECLARE
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
    BEGIN
        RETURN QUERY
        SELECT
            "Badges"."BadgeUUID",
            "Badges"."Name",
            "Held"."Holders",
            "Held"."InProgress",
            (CASE
                WHEN "Held"."Holders" + "Held"."InProgress" > 0
                THEN ("Held"."Holders" * 100.0) / ("Held"."Holders" + "Held"."InProgress")
                ELSE 0
            END)::decimal(5,2),
            "Shared"."Shares"
        FROM
            "dbo"."Badges"
            LEFT JOIN LATERAL (
                SELECT
                    count(*) FILTER (WHERE "UserBadges"."EarnedAt" IS NOT NULL AND "UserBadges"."RevokedAt" IS NULL) AS "Holders",
                    count(*) FILTER (WHERE "UserBadges"."EarnedAt" IS NULL) AS "InProgress"
                FROM "dbo"."UserBadges"
                WHERE "UserBadges"."BadgeUUID" = "Badges"."BadgeUUID"
                    AND "UserBadges"."OrganizationUUID" = _OrganizationUUID
            ) AS "Held" ON true
            LEFT JOIN LATERAL (
                SELECT count(*) AS "Shares"
                FROM "dbo"."SharedBadges"
                WHERE "SharedBadges"."BadgeUUID" = "Badges"."BadgeUUID"
            ) AS "Shared" ON true
        WHERE
            _IsMemberOfOrganization = true AND
            "Badges"."IsEnabled" = true AND
            (_BadgeUUID IS NULL OR "Badges"."BadgeUUID" = _BadgeUUID)
        ORDER BY "Badges"."Name";
    END;
$$ LANGUAGE plpgsql;
