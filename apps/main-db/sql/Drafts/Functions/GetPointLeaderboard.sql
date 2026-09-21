-- MERGED: GetPointsLeaderboard + GetPointLeaderboard were the same function under
-- two names. Kept the LEFT JOIN/COALESCE shape so users with no row still rank,
-- reading UserPointTotals.Points - the other version selected upt.TotalPoints,
-- a column that table does not have.
CREATE OR REPLACE FUNCTION GetPointLeaderboard(Limit INT)
    RETURNS TABLE (
                      UserId INT,
                      Username VARCHAR(100),
                      TotalPoints INT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT u.UserId, u.Username, COALESCE(upt.Points, 0) AS TotalPoints
        FROM Users u
                 LEFT JOIN UserPointTotals upt ON u.UserId = upt.UserId
        ORDER BY COALESCE(upt.Points, 0) DESC
        LIMIT Limit;
END;
$$ LANGUAGE plpgsql;
