CREATE OR REPLACE FUNCTION CalculateUserDailyPoints(UserId INT)
    RETURNS INT AS $$
DECLARE
    DailyPoints INT;
BEGIN
    SELECT SUM(PointsChange) INTO DailyPoints
    FROM PointUsageLogs
    WHERE UserId = UserId
      AND DATE_TRUNC('day', TransactionTimestamp) = DATE_TRUNC('day', NOW());

    RETURN COALESCE(DailyPoints, 0);
END;
$$ LANGUAGE plpgsql;
