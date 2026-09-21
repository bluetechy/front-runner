CREATE OR REPLACE FUNCTION GetPointUsageStatistics()
    RETURNS TABLE (
                      TransactionReason TEXT,
                      TotalPointsUsed INT,
                      TransactionCount INT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT
            TransactionReason,
            SUM(PointsChange) AS TotalPointsUsed,
            COUNT(*) AS TransactionCount
        FROM
            PointUsageLogs
        WHERE
                PointsChange < 0
        GROUP BY
            TransactionReason;
END;
$$ LANGUAGE plpgsql;
