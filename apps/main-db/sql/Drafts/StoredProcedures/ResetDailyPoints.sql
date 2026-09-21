CREATE OR REPLACE PROCEDURE ResetDailyPoints(UserId INT)
AS $$
BEGIN
    UPDATE UserPointTotals
    SET DailyPoints = 0
    WHERE UserId = UserId;
END;
$$ LANGUAGE plpgsql;
