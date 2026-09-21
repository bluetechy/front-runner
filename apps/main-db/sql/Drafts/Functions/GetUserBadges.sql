CREATE OR REPLACE FUNCTION GetUserBadges(UserId INT)
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
        WHERE ub.UserId = UserId;
END;
$$ LANGUAGE plpgsql;
