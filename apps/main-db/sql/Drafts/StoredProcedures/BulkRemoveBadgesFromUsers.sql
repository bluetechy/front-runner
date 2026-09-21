CREATE OR REPLACE PROCEDURE BulkRemoveBadgesFromUsers(BadgeId INT, UserIds INT[])
AS $$
BEGIN
    DELETE FROM UserBadges
    WHERE BadgeId = BadgeId AND UserId = ANY(UserIds);
END;
$$ LANGUAGE plpgsql;
