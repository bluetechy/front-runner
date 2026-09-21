CREATE OR REPLACE PROCEDURE AutoAssignFirstBadge(UserId INT)
AS $$
BEGIN
    -- Assign the first badge to the user upon registration
    INSERT INTO UserBadges (UserId, BadgeId, ProgressCurrent, EarnedAt)
    VALUES (UserId, 1, 1, NOW());
END;
$$ LANGUAGE plpgsql;
