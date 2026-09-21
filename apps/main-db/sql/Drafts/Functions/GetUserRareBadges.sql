CREATE OR REPLACE FUNCTION GetUserRareBadges(UserId INT)
    RETURNS TABLE (
                      BadgeId INT,
                      BadgeName VARCHAR(100),
                      RarityLevel VARCHAR(50)
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT
            b.BadgeId,
            b.BadgeName,
            b.RarityLevel
        FROM
            UserBadges ub
                JOIN
            Badges b ON ub.BadgeId = b.BadgeId
        WHERE
                ub.UserId = UserId
          AND b.RarityLevel = 'Rare';
END;
$$ LANGUAGE plpgsql;
