CREATE OR REPLACE PROCEDURE AddPointsToUser(UserId INT, Points INT, Reason TEXT, Details JSONB)
AS $$
BEGIN
    INSERT INTO UserPointTotals (UserId, Points)
    VALUES (UserId, Points)
    ON CONFLICT (UserId) DO UPDATE
        SET Points = UserPointTotals.Points + Points;
    INSERT INTO PointUsageLogs (UserId, PointsChange, TransactionReason, TransactionDetails)
    VALUES (UserId, Points, Reason, Details);
END;
$$ LANGUAGE plpgsql;
