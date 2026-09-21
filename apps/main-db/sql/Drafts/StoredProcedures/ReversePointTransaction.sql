CREATE OR REPLACE PROCEDURE ReversePointTransaction(TransactionId INT)
AS $$
BEGIN
    -- Find the original transaction
    DECLARE OriginalTransaction RECORD;
    SELECT * INTO OriginalTransaction
    FROM PointUsageLogs
    WHERE LogId = TransactionId;

    IF OriginalTransaction IS NOT NULL THEN
    -- Reverse the transaction
    INSERT INTO PointUsageLogs (UserId, PointsChange, TransactionReason, TransactionDetails)
    VALUES (OriginalTransaction.UserId, -OriginalTransaction.PointsChange, 'Reversal', OriginalTransaction.TransactionDetails);
    END IF;
    END;
$$ LANGUAGE plpgsql;
