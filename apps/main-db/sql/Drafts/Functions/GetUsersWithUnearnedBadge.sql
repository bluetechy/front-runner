CREATE OR REPLACE FUNCTION GetUsersWithUnearnedBadge(BadgeId INT)
    RETURNS TABLE (
                      UserId INT,
                      Username VARCHAR(100)
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT u.UserId, u.Username
        FROM Users u
        WHERE u.UserId NOT IN (
            SELECT UserId FROM UserBadges WHERE BadgeId = BadgeId
        )
        -- Add additional criteria here to filter eligible users for the badge.
        LIMIT 10;
END;
$$ LANGUAGE plpgsql;
