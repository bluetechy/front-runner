CREATE OR REPLACE FUNCTION CalculateUserWeeklyPoints(UserId INT)
    RETURNS INT AS $$
DECLARE
    WeeklyPoints INT;
BEGIN
    SELECT SUM(PointsChange) INTO WeeklyPoints
    FROM PointUsageLogs
    WHERE UserId = UserId
      AND EXTRACT(WEEK FROM TransactionTimestamp) = EXTRACT(WEEK FROM NOW());

    RETURN COALESCE(WeeklyPoints, 0);
END;
$$ LANGUAGE plpgsql;
