CREATE OR REPLACE PROCEDURE ApprovePointRedemption(RedemptionId INT)
AS $$
BEGIN
    UPDATE PointRedemptions
    SET RedemptionStatus = 'Approved'
    WHERE RedemptionId = RedemptionId;
END;
$$ LANGUAGE plpgsql;
