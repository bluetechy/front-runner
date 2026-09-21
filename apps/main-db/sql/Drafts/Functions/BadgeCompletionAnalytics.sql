CREATE OR REPLACE FUNCTION BadgeCompletionAnalytics()
    RETURNS TABLE (
                      BadgeId INT,
                      BadgeName VARCHAR(100),
                      TotalUsers INT,
                      CompletedUsers INT,
                      CompletionRate DECIMAL(5, 2)
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT
            b.BadgeId,
            b.BadgeName,
            COUNT(DISTINCT ub.UserId) AS TotalUsers,
            SUM(CASE WHEN ub.ProgressCurrent = bc.CriteriaValue THEN 1 ELSE 0 END) AS CompletedUsers,
            CASE
                WHEN COUNT(DISTINCT ub.UserId) > 0 THEN
                        (SUM(CASE WHEN ub.ProgressCurrent = bc.CriteriaValue THEN 1 ELSE 0 END) * 100.0) / COUNT(DISTINCT ub.UserId)
                ELSE
                    0
                END AS CompletionRate
        FROM
            Badges b
                LEFT JOIN
            UserBadges ub ON b.BadgeId = ub.BadgeId
                LEFT JOIN
            BadgeCriteria bc ON b.BadgeId = bc.BadgeId
        GROUP BY
            b.BadgeId, b.BadgeName;
END;
$$ LANGUAGE plpgsql;
