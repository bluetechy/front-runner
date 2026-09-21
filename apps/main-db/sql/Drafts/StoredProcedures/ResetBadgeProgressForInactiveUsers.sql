CREATE OR REPLACE PROCEDURE ResetBadgeProgressForInactiveUsers(InactivityPeriod INTERVAL)
AS $$
BEGIN
    -- Reset badge progress for users with no activity within the specified inactivity period.
    UPDATE UserBadges
    SET ProgressCurrent = 0
    WHERE UserId IN (
        SELECT UserId
        FROM Users
        WHERE LastActivityTimestamp < NOW() - InactivityPeriod
    );
END;
$$ LANGUAGE plpgsql;
