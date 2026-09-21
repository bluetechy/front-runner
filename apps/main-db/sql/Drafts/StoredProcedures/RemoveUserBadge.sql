CREATE OR REPLACE PROCEDURE RemoveUserBadge(UserId INT, BadgeId INT)
AS $$
BEGIN
    DELETE FROM UserBadges
    WHERE UserId = UserId AND BadgeId = BadgeId;
    -- Optionally, you can add logic to revoke associated achievements or progress.
END;
$$ LANGUAGE plpgsql;
