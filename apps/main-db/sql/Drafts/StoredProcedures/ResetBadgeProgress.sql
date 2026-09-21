CREATE OR REPLACE PROCEDURE ResetBadgeProgress(UserId INT, BadgeId INT)
AS $$
BEGIN
    UPDATE UserBadges
    SET ProgressCurrent = 0
    WHERE UserId = UserId AND BadgeId = BadgeId;
END;
$$ LANGUAGE plpgsql;
