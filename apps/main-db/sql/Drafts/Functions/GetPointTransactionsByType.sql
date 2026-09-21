CREATE OR REPLACE FUNCTION GetPointTransactionsByType(UserId INT, TransactionType VARCHAR(50), Limit INT)
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
        WHERE UserId = UserId AND TransactionReason = TransactionType
        ORDER BY TransactionTimestamp DESC
        LIMIT Limit;
END;
$$ LANGUAGE plpgsql;
