CREATE OR REPLACE FUNCTION GetTotalPointsEarned()
    RETURNS INT AS $$
DECLARE
    TotalPoints INT;
BEGIN
    SELECT SUM(PointsChange) INTO TotalPoints
    FROM PointUsageLogs;

    RETURN COALESCE(TotalPoints, 0);
END;
$$ LANGUAGE plpgsql;
