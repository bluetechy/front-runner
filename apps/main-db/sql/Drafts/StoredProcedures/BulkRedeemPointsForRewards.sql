CREATE OR REPLACE PROCEDURE BulkRedeemPointsForRewards(UserId INT, RewardIds INT[])
AS $$
BEGIN
    FOREACH RewardId IN ARRAY RewardIds
        LOOP
            -- Check if the user has enough points to redeem the reward
            DECLARE RequiredPoints INT;
            SELECT PointsRequired INTO RequiredPoints
        FROM Rewards
        WHERE RewardId = RewardId;

            DECLARE UserPoints INT;
            SELECT Points INTO UserPoints
        FROM UserPointTotals
        WHERE UserId = UserId;

            IF UserPoints >= RequiredPoints THEN
            -- Deduct points and record the redemption
            INSERT INTO PointUsageLogs (UserId, PointsChange, TransactionReason)
            VALUES (UserId, -RequiredPoints, 'Reward Redemption');

            -- Add logic to grant the reward to the user here.
            END IF;
            END LOOP;
            END;
$$ LANGUAGE plpgsql;
