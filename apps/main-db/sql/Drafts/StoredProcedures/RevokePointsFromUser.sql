CREATE OR REPLACE PROCEDURE RevokePointsFromUser(UserId INT, Points INT, Reason TEXT)
AS $$
BEGIN
    IF Points <= 0 THEN
        RAISE EXCEPTION 'Invalid points value';
    END IF;

    -- Deduct points and record the revocation
    INSERT INTO UserPointTotals (UserId, Points)
    VALUES (UserId, -Points)
    ON CONFLICT (UserId) DO UPDATE
        SET Points = UserPointTotals.Points - Points;

    INSERT INTO PointUsageLogs (UserId, PointsChange, TransactionReason)
    VALUES (UserId, -Points, Reason);
END;
$$ LANGUAGE plpgsql;
