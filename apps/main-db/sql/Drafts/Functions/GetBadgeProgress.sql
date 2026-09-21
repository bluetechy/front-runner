CREATE OR REPLACE FUNCTION GetBadgeProgress(UserId INT, BadgeId INT)
    RETURNS INT AS $$
DECLARE
    Progress INT;
BEGIN
    SELECT ProgressCurrent INTO Progress
    FROM UserBadges
    WHERE UserId = UserId AND BadgeId = BadgeId;

    RETURN COALESCE(Progress, 0);
END;
$$ LANGUAGE plpgsql;
