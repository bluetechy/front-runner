CREATE OR REPLACE FUNCTION GetPointActivityHistory(UserId INT, Limit INT)
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
        WHERE UserId = UserId
        ORDER BY TransactionTimestamp DESC
        LIMIT Limit;
END;
$$ LANGUAGE plpgsql;
