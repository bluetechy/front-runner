CREATE OR REPLACE FUNCTION GetNextPotentialBadges(UserId INT, Limit INT)
    RETURNS TABLE (
                      BadgeId INT,
                      BadgeName VARCHAR(100),
                      CriteriaDescription TEXT,
                      CriteriaValue INT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT b.BadgeId, b.BadgeName, bc.CriteriaDescription, bc.CriteriaValue
        FROM Badges b
                 JOIN BadgeCriteria bc ON b.BadgeId = bc.BadgeId
                 LEFT JOIN UserBadges ub ON b.BadgeId = ub.BadgeId AND ub.UserId = UserId
        WHERE ub.UserId IS NULL OR ub.ProgressCurrent < bc.CriteriaValue
        LIMIT Limit;
END;
$$ LANGUAGE plpgsql;
