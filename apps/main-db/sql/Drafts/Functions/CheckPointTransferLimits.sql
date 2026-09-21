CREATE OR REPLACE FUNCTION CheckPointTransferLimits(UserId INT, PointsToTransfer INT, TransferType VARCHAR(50))
    RETURNS BOOLEAN AS $$
DECLARE
    DailyLimit INT;
    MonthlyLimit INT;
    TotalDailyPoints INT;
    TotalMonthlyPoints INT;
BEGIN
    -- Retrieve user's point transfer limits
    SELECT
        DailyTransferLimit,
        MonthlyTransferLimit
    INTO
        DailyLimit,
        MonthlyLimit
    FROM
        UserPointTransferLimits
    WHERE
            UserId = UserId;

    -- Calculate the user's total daily and monthly transferred points
    SELECT
        COALESCE(SUM(PointsChange), 0)
    INTO
        TotalDailyPoints
    FROM
        PointTransfers
    WHERE
            SenderId = UserId
      AND TransactionReason = TransferType
      AND TransactionTimestamp >= CURRENT_DATE;

    SELECT
        COALESCE(SUM(PointsChange), 0)
    INTO
        TotalMonthlyPoints
    FROM
        PointTransfers
    WHERE
            SenderId = UserId
      AND TransactionReason = TransferType
      AND EXTRACT(MONTH FROM TransactionTimestamp) = EXTRACT(MONTH FROM CURRENT_DATE);

    -- Check if the transfer exceeds daily or monthly limits
    RETURN
            (TotalDailyPoints + PointsToTransfer <= DailyLimit) AND
            (TotalMonthlyPoints + PointsToTransfer <= MonthlyLimit);
END;
$$ LANGUAGE plpgsql;
