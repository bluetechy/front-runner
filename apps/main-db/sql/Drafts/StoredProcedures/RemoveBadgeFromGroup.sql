CREATE OR REPLACE PROCEDURE RemoveBadgeFromGroup(BadgeId INT, GroupId INT)
AS $$
BEGIN
    DELETE FROM BadgeGroupRelationships
    WHERE BadgeId = BadgeId AND GroupId = GroupId;
END;
$$ LANGUAGE plpgsql;
