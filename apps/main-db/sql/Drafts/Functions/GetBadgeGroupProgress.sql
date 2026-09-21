CREATE OR REPLACE FUNCTION GetBadgeGroupProgress(UserId INT)
    RETURNS TABLE (
                      GroupId INT,
                      GroupName VARCHAR(100),
                      BadgesCompleted INT,
                      TotalBadges INT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT
            bg.GroupId,
            bg.GroupName,
            COUNT(uba.BadgeId) AS BadgesCompleted,
            (SELECT COUNT(*) FROM BadgeGroupAssociations bga WHERE bga.GroupId = bg.GroupId) AS TotalBadges
        FROM
            BadgeGroups bg
                LEFT JOIN
            BadgeGroupAssociations bga ON bg.GroupId = bga.GroupId
                LEFT JOIN
            UserBadges uba ON bga.BadgeId = uba.BadgeId AND uba.UserId = UserId
        GROUP BY
            bg.GroupId, bg.GroupName;
END;
$$ LANGUAGE plpgsql;
