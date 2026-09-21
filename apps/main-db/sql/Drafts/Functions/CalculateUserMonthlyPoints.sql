CREATE OR REPLACE FUNCTION CalculateUserMonthlyPoints(UserId INT)
    RETURNS INT AS $$
DECLARE
    MonthlyPoints INT;
BEGIN
    SELECT SUM(PointsChange) INTO MonthlyPoints
    FROM PointUsageLogs
    WHERE UserId = UserId
      AND EXTRACT(MONTH FROM TransactionTimestamp) = EXTRACT(MONTH FROM NOW());

    RETURN COALESCE(MonthlyPoints, 0);
END;
$$ LANGUAGE plpgsql;
