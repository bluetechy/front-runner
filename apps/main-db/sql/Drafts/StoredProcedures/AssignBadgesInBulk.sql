CREATE OR REPLACE PROCEDURE AssignBadgesInBulk(UserId INT, BadgeIds INT[])
AS $$
BEGIN
    FOREACH BadgeId IN ARRAY BadgeIds
        LOOP
            INSERT INTO UserBadges (UserId, BadgeId)
            VALUES (UserId, BadgeId);
        END LOOP;
END;
$$ LANGUAGE plpgsql;
