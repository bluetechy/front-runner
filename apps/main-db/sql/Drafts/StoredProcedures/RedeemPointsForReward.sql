CREATE OR REPLACE PROCEDURE RedeemPointsForReward(UserId INT, RewardId INT, PointsRequired INT)
AS $$
BEGIN
    -- Check if the user has enough points to redeem the reward
    DECLARE UserPoints INT;
    SELECT Points INTO UserPoints
    FROM UserPointTotals
    WHERE UserId = UserId;

    IF UserPoints >= PointsRequired THEN
    -- Deduct points and record the redemption
    INSERT INTO PointUsageLogs (UserId, PointsChange, TransactionReason)
    VALUES (UserId, -PointsRequired, 'Reward Redemption');

    -- Add logic to grant the reward to the user here.
    ELSE
    -- Handle insufficient points situation (e.g., return an error or message).
    END IF;
    END;
$$ LANGUAGE plpgsql;
