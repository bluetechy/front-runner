CREATE OR REPLACE PROCEDURE SetPointSpendingLimit(UserId INT, SpendLimit INT)
AS $$
BEGIN
    UPDATE UserPointTotals
    SET SpendLimit = SpendLimit
    WHERE UserId = UserId;
END;
$$ LANGUAGE plpgsql;
