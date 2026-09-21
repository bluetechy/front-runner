CREATE OR REPLACE PROCEDURE AwardBadgeToUser(UserId INT, BadgeId INT, AchievementDescription TEXT)
AS $$
BEGIN
    INSERT INTO UserBadges (UserId, BadgeId, EarnedDescription)
    VALUES (UserId, BadgeId, AchievementDescription);
    INSERT INTO BadgeAchievements (UserId, BadgeId, MilestoneDescription)
    VALUES (UserId, BadgeId, AchievementDescription);
END;
$$ LANGUAGE plpgsql;
