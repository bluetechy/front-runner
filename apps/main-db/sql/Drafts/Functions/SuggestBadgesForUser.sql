CREATE OR REPLACE FUNCTION SuggestBadgesForUser(UserId INT, Limit INT)
    RETURNS TABLE (
                      BadgeId INT,
                      BadgeName VARCHAR(100),
                      BadgeDescription TEXT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT b.BadgeId, b.BadgeName, b.BadgeDescription
        FROM Badges b
        WHERE NOT EXISTS (
            SELECT 1
            FROM UserBadges ub
            WHERE ub.UserId = UserId AND ub.BadgeId = b.BadgeId
        )
        -- Implement your badge suggestion logic here (e.g., based on user activity).
        LIMIT Limit;
END;
$$ LANGUAGE plpgsql;
