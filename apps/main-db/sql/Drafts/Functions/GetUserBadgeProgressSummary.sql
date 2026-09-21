CREATE OR REPLACE FUNCTION GetUserBadgeProgressSummary(UserId INT)
    RETURNS TABLE (
                      BadgeId INT,
                      BadgeName VARCHAR(100),
                      CriteriaDescription TEXT,
                      CriteriaValue INT,
                      ProgressCurrent INT,
                      ProgressPercentage DECIMAL(5, 2)
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT
            b.BadgeId,
            b.BadgeName,
            bc.CriteriaDescription,
            bc.CriteriaValue,
            COALESCE(ub.ProgressCurrent, 0) AS ProgressCurrent,
            CASE
                WHEN bc.CriteriaValue > 0 THEN (COALESCE(ub.ProgressCurrent, 0) * 100.0) / bc.CriteriaValue
                ELSE 0
                END AS ProgressPercentage
        FROM Badges b
                 JOIN BadgeCriteria bc ON b.BadgeId = bc.BadgeId
                 LEFT JOIN UserBadges ub ON b.BadgeId = ub.BadgeId AND ub.UserId = UserId;
END;
$$ LANGUAGE plpgsql;
