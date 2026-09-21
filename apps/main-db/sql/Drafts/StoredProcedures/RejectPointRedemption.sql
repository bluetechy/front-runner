CREATE OR REPLACE PROCEDURE RejectPointRedemption(RedemptionId INT)
AS $$
BEGIN
    UPDATE PointRedemptions
    SET RedemptionStatus = 'Rejected'
    WHERE RedemptionId = RedemptionId;
END;
$$ LANGUAGE plpgsql;
