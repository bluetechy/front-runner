CREATE OR REPLACE FUNCTION GetPointLeaderboardForGroup(GroupId INT, Limit INT)
    RETURNS TABLE (
                      UserId INT,
                      Username VARCHAR(100),
                      TotalPoints INT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT u.UserId, u.Username, COALESCE(upt.TotalPoints, 0) AS TotalPoints
        FROM Users u
                 LEFT JOIN UserPointTotals upt ON u.UserId = upt.UserId
        WHERE u.GroupId = GroupId
        ORDER BY COALESCE(upt.TotalPoints, 0) DESC
        LIMIT Limit;
END;
$$ LANGUAGE plpgsql;
