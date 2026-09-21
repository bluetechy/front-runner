CREATE OR REPLACE FUNCTION CalculateUserPointBalance(UserId INT)
    RETURNS INT AS $$
DECLARE
    Balance INT;
BEGIN
    SELECT SUM(PointsChange) INTO Balance
    FROM PointUsageLogs
    WHERE UserId = UserId;

    RETURN COALESCE(Balance, 0);
END;
$$ LANGUAGE plpgsql;
