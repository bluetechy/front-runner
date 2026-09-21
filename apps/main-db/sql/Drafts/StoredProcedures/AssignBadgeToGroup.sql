CREATE OR REPLACE PROCEDURE AssignBadgeToGroup(BadgeId INT, GroupId INT)
AS $$
BEGIN
    INSERT INTO BadgeGroupRelationships (BadgeId, GroupId)
    VALUES (BadgeId, GroupId);
END;
$$ LANGUAGE plpgsql;
