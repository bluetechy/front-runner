CREATE OR REPLACE FUNCTION AuditPointTransactions(StartDate TIMESTAMPTZ, EndDate TIMESTAMPTZ)
    RETURNS TABLE (
                      TransactionId INT,
                      UserId INT,
                      PointsChange INT,
                      TransactionReason TEXT,
                      TransactionDetails JSONB,
                      TransactionTimestamp TIMESTAMPTZ
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT LogId, UserId, PointsChange, TransactionReason, TransactionDetails, TransactionTimestamp
        FROM PointUsageLogs
        WHERE TransactionTimestamp >= StartDate AND TransactionTimestamp <= EndDate
        ORDER BY TransactionTimestamp;
END;
$$ LANGUAGE plpgsql;
