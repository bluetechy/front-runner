CREATE OR REPLACE PROCEDURE UnblockUserPoints(UserId INT)
AS $$
BEGIN
    UPDATE UserPointTotals
    SET PointsBlocked = 0
    WHERE UserId = UserId;
END;
$$ LANGUAGE plpgsql;
