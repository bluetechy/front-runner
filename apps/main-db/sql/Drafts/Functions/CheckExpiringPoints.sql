CREATE OR REPLACE FUNCTION CheckExpiringPoints(ExpirationDate TIMESTAMPTZ, NotificationDays INT)
    RETURNS TABLE (
                      UserId INT,
                      PointsToExpire INT,
                      ExpirationDate TIMESTAMPTZ
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT
            UserId,
            SUM(PointsChange) AS PointsToExpire,
            ExpirationDate
        FROM
            PointUsageLogs
        WHERE
                TransactionReason = 'Points Earned'
          AND TransactionTimestamp >= NOW()
          AND TransactionTimestamp <= NOW() + (NotificationDays || ' days')::INTERVAL
        GROUP BY
            UserId, ExpirationDate;
END;
$$ LANGUAGE plpgsql;
