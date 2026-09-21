CREATE OR REPLACE PROCEDURE UpdateBadgeProgress(UserId INT, BadgeId INT, Progress INT)
AS $$
BEGIN
    UPDATE UserBadges
    SET ProgressCurrent = ProgressCurrent + Progress
    WHERE UserId = UserId AND BadgeId = BadgeId;
END;
$$ LANGUAGE plpgsql;
