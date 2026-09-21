CREATE OR REPLACE PROCEDURE RevokeBadgeFromUser(UserId INT, BadgeId INT, Reason TEXT)
AS $$
BEGIN
    DELETE FROM UserBadges
    WHERE UserId = UserId AND BadgeId = BadgeId;
    -- Optionally, you can add logic to handle the revocation reason.
END;
$$ LANGUAGE plpgsql;
