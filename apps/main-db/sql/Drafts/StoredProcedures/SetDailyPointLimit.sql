CREATE OR REPLACE PROCEDURE SetDailyPointLimit(UserId INT, DailyLimit INT)
AS $$
BEGIN
    UPDATE UserPointTotals
    SET DailyLimit = DailyLimit
    WHERE UserId = UserId;
END;
$$ LANGUAGE plpgsql;
