CREATE OR REPLACE FUNCTION GetPointRedemptionHistory(UserId INT, Limit INT)
    RETURNS TABLE (
                      RedemptionId INT,
                      RewardId INT,
                      PointsUsed INT,
                      RedemptionTimestamp TIMESTAMPTZ
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT RedemptionId, RewardId, PointsUsed, RedemptionTimestamp
        FROM PointRedemptions
        WHERE UserId = UserId
        ORDER BY RedemptionTimestamp DESC
        LIMIT Limit;
END;
$$ LANGUAGE plpgsql;
