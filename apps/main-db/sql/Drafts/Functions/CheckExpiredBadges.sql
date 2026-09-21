CREATE OR REPLACE FUNCTION CheckExpiredBadges(ExpirationDate TIMESTAMPTZ)
    RETURNS TABLE (
                      UserId INT,
                      BadgeId INT,
                      BadgeName VARCHAR(100),
                      ExpirationDate TIMESTAMPTZ
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT ub.UserId, ub.BadgeId, b.BadgeName, b.ExpirationDate
        FROM UserBadges ub
                 JOIN Badges b ON ub.BadgeId = b.BadgeId
        WHERE b.ExpirationDate <= ExpirationDate;
END;
$$ LANGUAGE plpgsql;
