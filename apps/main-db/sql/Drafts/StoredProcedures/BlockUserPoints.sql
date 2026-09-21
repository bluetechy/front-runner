CREATE OR REPLACE PROCEDURE BlockUserPoints(UserId INT)
AS $$
BEGIN
    UPDATE UserPointTotals
    SET PointsBlocked = Points
    WHERE UserId = UserId;
END;
$$ LANGUAGE plpgsql;
