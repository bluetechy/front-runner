CREATE OR REPLACE PROCEDURE PointRollover(UserId INT)
AS $$
BEGIN
    -- Calculate and carry over unused daily points to the next day
    DECLARE UnusedPoints INT;
    SELECT DailyPoints - DailyLimit INTO UnusedPoints
    FROM UserPointTotals
    WHERE UserId = UserId;

    IF UnusedPoints > 0 THEN
    UPDATE UserPointTotals
    SET Points = Points + UnusedPoints,
            DailyPoints = DailyLimit
        WHERE UserId = UserId;
    END IF;
    END;
$$ LANGUAGE plpgsql;
