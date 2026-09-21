CREATE OR REPLACE FUNCTION BadgeSharingAnalytics()
    RETURNS TABLE (
                      BadgeId INT,
                      BadgeName VARCHAR(100),
                      TotalShares INT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT
            b.BadgeId,
            b.BadgeName,
            COUNT(DISTINCT us.UserId) AS TotalShares
        FROM
            Badges b
                LEFT JOIN
            UserSharedBadges usb ON b.BadgeId = usb.BadgeId
                LEFT JOIN
            Users us ON usb.UserId = us.UserId
        GROUP BY
            b.BadgeId, b.BadgeName;
END;
$$ LANGUAGE plpgsql;
