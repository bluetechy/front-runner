CREATE OR REPLACE PROCEDURE RedeemPoints(UserId INT, Points INT, RewardDescription TEXT)
AS $$
BEGIN
    IF Points <= 0 THEN
        RAISE EXCEPTION 'Invalid points value';
    END IF;

    -- Check if the user has enough points to redeem
    DECLARE AvailablePoints INT;
    SELECT Points INTO AvailablePoints
    FROM UserPointTotals
    WHERE UserId = UserId;

    IF AvailablePoints < Points THEN
        RAISE EXCEPTION 'Insufficient points for redemption';
    END IF;

    -- Deduct points and record the redemption
    INSERT INTO UserPointTotals (UserId, Points)
    VALUES (UserId, -Points)
        ON CONFLICT (UserId) DO UPDATE
    SET Points = UserPointTotals.Points - Points;

    INSERT INTO PointRedemptions (UserId, RedeemedPoints, RedemptionDescription, RedemptionStatus)
    VALUES (UserId, Points, RewardDescription, 'Pending');
    END;
$$ LANGUAGE plpgsql;
