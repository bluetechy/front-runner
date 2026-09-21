CREATE OR REPLACE FUNCTION GetRecentlyEarnedBadges(UserId INT, Limit INT)
    RETURNS TABLE (
                      BadgeId INT,
                      BadgeName VARCHAR(100),
                      EarnedAt TIMESTAMPTZ
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT ub.BadgeId, b.BadgeName, ub.EarnedAt
        FROM UserBadges ub
                 JOIN Badges b ON ub.BadgeId = b.BadgeId
        WHERE ub.UserId = UserId
        ORDER BY ub.EarnedAt DESC
        LIMIT Limit;
END;
$$ LANGUAGE plpgsql;
