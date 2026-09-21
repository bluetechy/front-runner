CREATE OR REPLACE PROCEDURE SendBadgeRemovalNotification(UserId INT, BadgeId INT, RemovalReason TEXT)
AS $$
BEGIN
    -- Send a notification to the user explaining the badge removal and the reason.
    -- Implement notification logic here.
END;
$$ LANGUAGE plpgsql;
