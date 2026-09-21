CREATE OR REPLACE PROCEDURE MergeUserAccounts(SourceUserId INT, TargetUserId INT)
AS $$
BEGIN
    -- Transfer points from the source user to the target user
    INSERT INTO UserPointTotals (UserId, Points)
    SELECT TargetUserId, Points
    FROM UserPointTotals
    WHERE UserId = SourceUserId;

    -- Remove the source user's point totals
    DELETE FROM UserPointTotals WHERE UserId = SourceUserId;
END;
$$ LANGUAGE plpgsql;
