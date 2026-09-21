CREATE OR REPLACE PROCEDURE MigrateUserBadges(SourceUserId INT, TargetUserId INT)
AS $$
BEGIN
    -- Migrate user's badges from the source user to the target user
    INSERT INTO UserBadges (UserId, BadgeId, ProgressCurrent, EarnedAt)
    SELECT
        TargetUserId,
        BadgeId,
        ProgressCurrent,
        EarnedAt
    FROM UserBadges
    WHERE UserId = SourceUserId;

    -- Optionally, you can remove badges from the source user after migration.
    -- DELETE FROM user_badges WHERE user_id = source_user_id;
END;
$$ LANGUAGE plpgsql;
