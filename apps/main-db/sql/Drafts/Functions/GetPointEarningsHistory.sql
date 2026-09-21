CREATE OR REPLACE FUNCTION GetPointEarningsHistory(UserId INT, Limit INT)
    RETURNS TABLE (
                      TransactionId INT,
                      PointsChange INT,
                      TransactionReason TEXT,
                      TransactionDetails JSONB,
                      TransactionTimestamp TIMESTAMPTZ
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT LogId, PointsChange, TransactionReason, TransactionDetails, TransactionTimestamp
        FROM PointUsageLogs
        WHERE UserId = UserId AND PointsChange > 0
        ORDER BY TransactionTimestamp DESC
        LIMIT Limit;
END;
$$ LANGUAGE plpgsql;
