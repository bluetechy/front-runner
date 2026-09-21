CREATE OR REPLACE FUNCTION GetUsersWithBadge(BadgeId INT)
    RETURNS TABLE (
                      UserId INT,
                      Username VARCHAR(100)
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT ub.UserId, u.Username
        FROM UserBadges ub
                 JOIN Users u ON ub.UserId = u.UserId
        WHERE ub.BadgeId = BadgeId;
END;
$$ LANGUAGE plpgsql;
