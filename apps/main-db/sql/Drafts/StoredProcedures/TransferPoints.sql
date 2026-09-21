CREATE OR REPLACE PROCEDURE TransferPoints(SenderId INT, ReceiverId INT, Points INT, Reason TEXT, Details JSONB)
AS $$
BEGIN
    INSERT INTO UserPointTotals (UserId, Points)
    VALUES (SenderId, -Points)
    ON CONFLICT (UserId) DO UPDATE
        SET Points = UserPointTotals.Points - Points;
    INSERT INTO UserPointTotals (UserId, Points)
    VALUES (ReceiverId, Points)
    ON CONFLICT (UserId) DO UPDATE
        SET Points = UserPointTotals.Points + Points;
    INSERT INTO PointUsageLogs (UserId, PointsChange, TransactionReason, TransactionDetails)
    VALUES (SenderId, -Points, Reason, Details);
    INSERT INTO PointUsageLogs (UserId, PointsChange, TransactionReason, TransactionDetails)
    VALUES (ReceiverId, Points, Reason, Details);
END;
$$ LANGUAGE plpgsql;
