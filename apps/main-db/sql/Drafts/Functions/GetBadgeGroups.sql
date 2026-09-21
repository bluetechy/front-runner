CREATE OR REPLACE FUNCTION GetBadgeGroups()
    RETURNS TABLE (
                      GroupId INT,
                      GroupName VARCHAR(100),
                      BadgeId INT,
                      BadgeName VARCHAR(100)
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT bg.GroupId, bg.GroupName, bgrel.BadgeId, b.BadgeName
        FROM BadgeGroups bg
                 LEFT JOIN BadgeGroupRelationships bgrel ON bg.GroupId = bgrel.GroupId
                 LEFT JOIN Badges b ON bgrel.BadgeId = b.BadgeId;
END;
$$ LANGUAGE plpgsql;
