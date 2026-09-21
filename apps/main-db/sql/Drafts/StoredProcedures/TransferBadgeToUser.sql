CREATE OR REPLACE PROCEDURE TransferBadgeToUser(SenderId INT, RecipientId INT, BadgeId INT)
AS $$
BEGIN
    -- Transfer ownership of the specified badge from sender to recipient.
    -- Update badge ownership records accordingly.
END;
$$ LANGUAGE plpgsql;
