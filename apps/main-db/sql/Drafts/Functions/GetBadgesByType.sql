CREATE OR REPLACE FUNCTION GetBadgesByType(BadgeType VARCHAR(50))
    RETURNS TABLE (
                      BadgeId INT,
                      BadgeName VARCHAR(100)
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT BadgeId, BadgeName
        FROM Badges
        WHERE BadgeType = BadgeType;
END;
$$ LANGUAGE plpgsql;
