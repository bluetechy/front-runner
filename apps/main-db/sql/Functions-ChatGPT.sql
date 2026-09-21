CREATE OR REPLACE FUNCTION get_user_badges(user_id INT)
    RETURNS TABLE (
                      badge_id INT,
                      badge_name VARCHAR(100),
                      earned_at TIMESTAMPTZ
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT ub.badge_id, b.badge_name, ub.earned_at
        FROM user_badges ub
                 JOIN badges b ON ub.badge_id = b.badge_id
        WHERE ub.user_id = user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE award_badge_to_user(user_id INT, badge_id INT, achievement_description TEXT)
AS $$
BEGIN
    INSERT INTO user_badges (user_id, badge_id, earned_description)
    VALUES (user_id, badge_id, achievement_description);
    INSERT INTO badge_achievements (user_id, badge_id, milestone_description)
    VALUES (user_id, badge_id, achievement_description);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE add_points_to_user(user_id INT, points INT, reason TEXT, details JSONB)
AS $$
BEGIN
    INSERT INTO user_point_totals (user_id, points)
    VALUES (user_id, points)
    ON CONFLICT (user_id) DO UPDATE
        SET points = user_point_totals.points + points;
    INSERT INTO point_usage_logs (user_id, points_change, transaction_reason, transaction_details)
    VALUES (user_id, points, reason, details);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE spend_points(user_id INT, points INT, reason TEXT, details JSONB)
AS $$
BEGIN
    INSERT INTO user_point_totals (user_id, points)
    VALUES (user_id, -points)
    ON CONFLICT (user_id) DO UPDATE
        SET points = user_point_totals.points - points;
    INSERT INTO point_usage_logs (user_id, points_change, transaction_reason, transaction_details)
    VALUES (user_id, -points, reason, details);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE transfer_points(sender_id INT, receiver_id INT, points INT, reason TEXT, details JSONB)
AS $$
BEGIN
    INSERT INTO user_point_totals (user_id, points)
    VALUES (sender_id, -points)
    ON CONFLICT (user_id) DO UPDATE
        SET points = user_point_totals.points - points;
    INSERT INTO user_point_totals (user_id, points)
    VALUES (receiver_id, points)
    ON CONFLICT (user_id) DO UPDATE
        SET points = user_point_totals.points + points;
    INSERT INTO point_usage_logs (user_id, points_change, transaction_reason, transaction_details)
    VALUES (sender_id, -points, reason, details);
    INSERT INTO point_usage_logs (user_id, points_change, transaction_reason, transaction_details)
    VALUES (receiver_id, points, reason, details);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_badge_groups()
    RETURNS TABLE (
                      group_id INT,
                      group_name VARCHAR(100),
                      badge_id INT,
                      badge_name VARCHAR(100)
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT bg.group_id, bg.group_name, bgrel.badge_id, b.badge_name
        FROM badge_groups bg
                 LEFT JOIN badge_group_relationships bgrel ON bg.group_id = bgrel.group_id
                 LEFT JOIN badges b ON bgrel.badge_id = b.badge_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE assign_badge_to_group(badge_id INT, group_id INT)
AS $$
BEGIN
    INSERT INTO badge_group_relationships (badge_id, group_id)
    VALUES (badge_id, group_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE redeem_points(user_id INT, points INT, reward_description TEXT)
AS $$
BEGIN
    IF points <= 0 THEN
        RAISE EXCEPTION 'Invalid points value';
    END IF;

    -- Check if the user has enough points to redeem
    DECLARE available_points INT;
    SELECT points INTO available_points
    FROM user_point_totals
    WHERE user_id = user_id;

    IF available_points < points THEN
        RAISE EXCEPTION 'Insufficient points for redemption';
    END IF;

    -- Deduct points and record the redemption
    INSERT INTO user_point_totals (user_id, points)
    VALUES (user_id, -points)
        ON CONFLICT (user_id) DO UPDATE
    SET points = user_point_totals.points - points;

    INSERT INTO point_redemptions (user_id, redeemed_points, redemption_description, redemption_status)
    VALUES (user_id, points, reward_description, 'Pending');
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE approve_point_redemption(redemption_id INT)
AS $$
BEGIN
    UPDATE point_redemptions
    SET redemption_status = 'Approved'
    WHERE redemption_id = redemption_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE reject_point_redemption(redemption_id INT)
AS $$
BEGIN
    UPDATE point_redemptions
    SET redemption_status = 'Rejected'
    WHERE redemption_id = redemption_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_badge_criteria(badge_id INT)
    RETURNS TABLE (
                      criteria_id INT,
                      criteria_description TEXT,
                      criteria_type VARCHAR(50),
                      criteria_value INT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT criteria_id, criteria_description, criteria_type, criteria_value
        FROM badge_criteria
        WHERE badge_id = badge_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE update_badge_progress(user_id INT, badge_id INT, progress INT)
AS $$
BEGIN
    UPDATE user_badges
    SET progress_current = progress_current + progress
    WHERE user_id = user_id AND badge_id = badge_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE set_daily_point_limit(user_id INT, daily_limit INT)
AS $$
BEGIN
    UPDATE user_point_totals
    SET daily_limit = daily_limit
    WHERE user_id = user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE set_point_spending_limit(user_id INT, spend_limit INT)
AS $$
BEGIN
    UPDATE user_point_totals
    SET spend_limit = spend_limit
    WHERE user_id = user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE apply_point_multiplier(user_id INT, multiplier_id INT)
AS $$
BEGIN
    DECLARE multiplier_factor DECIMAL(5,2);

    SELECT multiplier_factor INTO multiplier_factor
    FROM point_multipliers
    WHERE multiplier_id = multiplier_id;

    IF multiplier_factor IS NOT NULL THEN
    UPDATE user_point_totals
    SET points = points * multiplier_factor
        WHERE user_id = user_id;
    END IF;
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_point_transactions(user_id INT)
    RETURNS TABLE (
                      transaction_id INT,
                      points_change INT,
                      transaction_reason TEXT,
                      transaction_details JSONB,
                      transaction_timestamp TIMESTAMPTZ
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT log_id, points_change, transaction_reason, transaction_details, transaction_timestamp
        FROM point_usage_logs
        WHERE user_id = user_id
        ORDER BY transaction_timestamp DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_badge_owners(badge_id INT)
    RETURNS TABLE (
                      user_id INT,
                      username VARCHAR(100)
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT ub.user_id, u.username
        FROM user_badges ub
                 JOIN users u ON ub.user_id = u.user_id
        WHERE ub.badge_id = badge_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE remove_user_badge(user_id INT, badge_id INT)
AS $$
BEGIN
    DELETE FROM user_badges
    WHERE user_id = user_id AND badge_id = badge_id;
    -- Optionally, you can add logic to revoke associated achievements or progress.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE request_point_transfer(sender_id INT, receiver_id INT, points INT, reason TEXT, details JSONB)
AS $$
BEGIN
    -- Insert a request record
    INSERT INTO point_transfer_requests (sender_id, receiver_id, points, transfer_reason, transfer_details, status)
    VALUES (sender_id, receiver_id, points, reason, details, 'Pending');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE confirm_point_transfer(request_id INT)
AS $$
BEGIN
    -- Get the request details
    DECLARE request_record RECORD;
    SELECT * INTO request_record FROM point_transfer_requests WHERE transfer_request_id = request_id;

    IF request_record.status = 'Pending' THEN
    -- Deduct points from sender
    UPDATE user_point_totals
    SET points = points - request_record.points
        WHERE user_id = request_record.sender_id;

    -- Add points to receiver
    UPDATE user_point_totals
    SET points = points + request_record.points
        WHERE user_id = request_record.receiver_id;

    -- Update request status
    UPDATE point_transfer_requests
    SET status = 'Completed'
        WHERE transfer_request_id = request_id;
    END IF;
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_users_with_badge(badge_id INT)
    RETURNS TABLE (
                      user_id INT,
                      username VARCHAR(100)
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT ub.user_id, u.username
        FROM user_badges ub
                 JOIN users u ON ub.user_id = u.user_id
        WHERE ub.badge_id = badge_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION assign_badges_automatically()
    RETURNS void AS $$
BEGIN
    -- Define your badge assignment logic here
    -- For example, check user activity and award badges accordingly
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_user_point_balance(user_id INT)
    RETURNS INT AS $$
DECLARE
    balance INT;
BEGIN
    SELECT SUM(points_change) INTO balance
    FROM point_usage_logs
    WHERE user_id = user_id;

    RETURN COALESCE(balance, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_total_points_earned()
    RETURNS INT AS $$
DECLARE
    total_points INT;
BEGIN
    SELECT SUM(points_change) INTO total_points
    FROM point_usage_logs;

    RETURN COALESCE(total_points, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE reset_daily_points(user_id INT)
AS $$
BEGIN
    UPDATE user_point_totals
    SET daily_points = 0
    WHERE user_id = user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE remove_badge_from_group(badge_id INT, group_id INT)
AS $$
BEGIN
    DELETE FROM badge_group_relationships
    WHERE badge_id = badge_id AND group_id = group_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE update_badge_criteria(criteria_id INT, criteria_description TEXT, criteria_type VARCHAR(50), criteria_value INT)
AS $$
BEGIN
    UPDATE badge_criteria
    SET
        criteria_description = criteria_description,
        criteria_type = criteria_type,
        criteria_value = criteria_value
    WHERE criteria_id = criteria_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE block_user_points(user_id INT)
AS $$
BEGIN
    UPDATE user_point_totals
    SET points_blocked = points
    WHERE user_id = user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE unblock_user_points(user_id INT)
AS $$
BEGIN
    UPDATE user_point_totals
    SET points_blocked = 0
    WHERE user_id = user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_user_daily_points(user_id INT)
    RETURNS INT AS $$
DECLARE
    daily_points INT;
BEGIN
    SELECT SUM(points_change) INTO daily_points
    FROM point_usage_logs
    WHERE user_id = user_id
      AND DATE_TRUNC('day', transaction_timestamp) = DATE_TRUNC('day', NOW());

    RETURN COALESCE(daily_points, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE revoke_points_from_user(user_id INT, points INT, reason TEXT)
AS $$
BEGIN
    IF points <= 0 THEN
        RAISE EXCEPTION 'Invalid points value';
    END IF;

    -- Deduct points and record the revocation
    INSERT INTO user_point_totals (user_id, points)
    VALUES (user_id, -points)
    ON CONFLICT (user_id) DO UPDATE
        SET points = user_point_totals.points - points;

    INSERT INTO point_usage_logs (user_id, points_change, transaction_reason)
    VALUES (user_id, -points, reason);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_badge_progress(user_id INT, badge_id INT)
    RETURNS INT AS $$
DECLARE
    progress INT;
BEGIN
    SELECT progress_current INTO progress
    FROM user_badges
    WHERE user_id = user_id AND badge_id = badge_id;

    RETURN COALESCE(progress, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE reset_badge_progress(user_id INT, badge_id INT)
AS $$
BEGIN
    UPDATE user_badges
    SET progress_current = 0
    WHERE user_id = user_id AND badge_id = badge_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION expire_points_automatically()
    RETURNS void AS $$
BEGIN
    -- Define your point expiration logic here
    -- Check point transaction timestamps and mark expired points
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE merge_user_accounts(source_user_id INT, target_user_id INT)
AS $$
BEGIN
    -- Transfer points from the source user to the target user
    INSERT INTO user_point_totals (user_id, points)
    SELECT target_user_id, points
    FROM user_point_totals
    WHERE user_id = source_user_id;

    -- Remove the source user's point totals
    DELETE FROM user_point_totals WHERE user_id = source_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_badges_by_type(badge_type VARCHAR(50))
    RETURNS TABLE (
                      badge_id INT,
                      badge_name VARCHAR(100)
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT badge_id, badge_name
        FROM badges
        WHERE badge_type = badge_type;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE assign_badges_in_bulk(user_id INT, badge_ids INT[])
AS $$
BEGIN
    FOREACH badge_id IN ARRAY badge_ids
        LOOP
            INSERT INTO user_badges (user_id, badge_id)
            VALUES (user_id, badge_id);
        END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE point_rollover(user_id INT)
AS $$
BEGIN
    -- Calculate and carry over unused daily points to the next day
    DECLARE unused_points INT;
    SELECT daily_points - daily_limit INTO unused_points
    FROM user_point_totals
    WHERE user_id = user_id;

    IF unused_points > 0 THEN
    UPDATE user_point_totals
    SET points = points + unused_points,
            daily_points = daily_limit
        WHERE user_id = user_id;
    END IF;
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_user_weekly_points(user_id INT)
    RETURNS INT AS $$
DECLARE
    weekly_points INT;
BEGIN
    SELECT SUM(points_change) INTO weekly_points
    FROM point_usage_logs
    WHERE user_id = user_id
      AND EXTRACT(WEEK FROM transaction_timestamp) = EXTRACT(WEEK FROM NOW());

    RETURN COALESCE(weekly_points, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_recently_earned_badges(user_id INT, limit INT)
    RETURNS TABLE (
                      badge_id INT,
                      badge_name VARCHAR(100),
                      earned_at TIMESTAMPTZ
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT ub.badge_id, b.badge_name, ub.earned_at
        FROM user_badges ub
                 JOIN badges b ON ub.badge_id = b.badge_id
        WHERE ub.user_id = user_id
        ORDER BY ub.earned_at DESC
        LIMIT limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE notify_user_of_earned_badge(user_id INT, badge_id INT)
AS $$
BEGIN
    -- Implement your notification logic here (e.g., send an email or push notification)
    -- You can use external libraries or tools for notifications.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_points_leaderboard(limit INT)
    RETURNS TABLE (
                      user_id INT,
                      username VARCHAR(100),
                      points INT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT u.user_id, u.username, upt.points
        FROM users u
                 JOIN user_point_totals upt ON u.user_id = upt.user_id
        ORDER BY upt.points DESC
        LIMIT limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_point_transfer_history(user_id INT, limit INT)
    RETURNS TABLE (
                      transfer_id INT,
                      sender_id INT,
                      receiver_id INT,
                      points INT,
                      transfer_reason TEXT,
                      transfer_timestamp TIMESTAMPTZ
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT transfer_id, sender_id, receiver_id, points, transfer_reason, transfer_timestamp
        FROM point_transfers
        WHERE sender_id = user_id OR receiver_id = user_id
        ORDER BY transfer_timestamp DESC
        LIMIT limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_next_potential_badges(user_id INT, limit INT)
    RETURNS TABLE (
                      badge_id INT,
                      badge_name VARCHAR(100),
                      criteria_description TEXT,
                      criteria_value INT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT b.badge_id, b.badge_name, bc.criteria_description, bc.criteria_value
        FROM badges b
                 JOIN badge_criteria bc ON b.badge_id = bc.badge_id
                 LEFT JOIN user_badges ub ON b.badge_id = ub.badge_id AND ub.user_id = user_id
        WHERE ub.user_id IS NULL OR ub.progress_current < bc.criteria_value
        LIMIT limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_award_badges()
    RETURNS void AS $$
BEGIN
    -- Define your badge awarding logic here
    -- Check user activity and award badges accordingly
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_point_transactions_by_type(user_id INT, transaction_type VARCHAR(50), limit INT)
    RETURNS TABLE (
                      transaction_id INT,
                      points_change INT,
                      transaction_reason TEXT,
                      transaction_details JSONB,
                      transaction_timestamp TIMESTAMPTZ
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT log_id, points_change, transaction_reason, transaction_details, transaction_timestamp
        FROM point_usage_logs
        WHERE user_id = user_id AND transaction_reason = transaction_type
        ORDER BY transaction_timestamp DESC
        LIMIT limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE reverse_point_transaction(transaction_id INT)
AS $$
BEGIN
    -- Find the original transaction
    DECLARE original_transaction RECORD;
    SELECT * INTO original_transaction
    FROM point_usage_logs
    WHERE log_id = transaction_id;

    IF original_transaction IS NOT NULL THEN
    -- Reverse the transaction
    INSERT INTO point_usage_logs (user_id, points_change, transaction_reason, transaction_details)
    VALUES (original_transaction.user_id, -original_transaction.points_change, 'Reversal', original_transaction.transaction_details);
    END IF;
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_badge_progress_summary(user_id INT)
    RETURNS TABLE (
                      badge_id INT,
                      badge_name VARCHAR(100),
                      criteria_description TEXT,
                      criteria_value INT,
                      progress_current INT,
                      progress_percentage DECIMAL(5, 2)
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT
            b.badge_id,
            b.badge_name,
            bc.criteria_description,
            bc.criteria_value,
            COALESCE(ub.progress_current, 0) AS progress_current,
            CASE
                WHEN bc.criteria_value > 0 THEN (COALESCE(ub.progress_current, 0) * 100.0) / bc.criteria_value
                ELSE 0
                END AS progress_percentage
        FROM badges b
                 JOIN badge_criteria bc ON b.badge_id = bc.badge_id
                 LEFT JOIN user_badges ub ON b.badge_id = ub.badge_id AND ub.user_id = user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE revoke_badge_from_user(user_id INT, badge_id INT, reason TEXT)
AS $$
BEGIN
    DELETE FROM user_badges
    WHERE user_id = user_id AND badge_id = badge_id;
    -- Optionally, you can add logic to handle the revocation reason.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION audit_point_transactions(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
    RETURNS TABLE (
                      transaction_id INT,
                      user_id INT,
                      points_change INT,
                      transaction_reason TEXT,
                      transaction_details JSONB,
                      transaction_timestamp TIMESTAMPTZ
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT log_id, user_id, points_change, transaction_reason, transaction_details, transaction_timestamp
        FROM point_usage_logs
        WHERE transaction_timestamp >= start_date AND transaction_timestamp <= end_date
        ORDER BY transaction_timestamp;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE cancel_point_transfer_request(transfer_request_id INT)
AS $$
BEGIN
    DELETE FROM point_transfer_requests
    WHERE transfer_request_id = transfer_request_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE assign_badges_based_on_activity()
AS $$
BEGIN
    -- Implement your badge assignment logic here
    -- For example, award badges for reaching certain milestones or achieving specific goals.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_users_with_unearned_badge(badge_id INT)
    RETURNS TABLE (
                      user_id INT,
                      username VARCHAR(100)
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT u.user_id, u.username
        FROM users u
        WHERE u.user_id NOT IN (
            SELECT user_id FROM user_badges WHERE badge_id = badge_id
        )
        -- Add additional criteria here to filter eligible users for the badge.
        LIMIT 10;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE approve_point_transfer_request(transfer_request_id INT, approved BOOLEAN)
AS $$
BEGIN
    IF approved THEN
        -- Process the point transfer and update the request status
        -- Add logic to handle the approval action here.
    ELSE
        -- Reject the point transfer request
        DELETE FROM point_transfer_requests WHERE transfer_request_id = transfer_request_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_user_monthly_points(user_id INT)
    RETURNS INT AS $$
DECLARE
    monthly_points INT;
BEGIN
    SELECT SUM(points_change) INTO monthly_points
    FROM point_usage_logs
    WHERE user_id = user_id
      AND EXTRACT(MONTH FROM transaction_timestamp) = EXTRACT(MONTH FROM NOW());

    RETURN COALESCE(monthly_points, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_rare_badges(user_id INT)
    RETURNS TABLE (
                      badge_id INT,
                      badge_name VARCHAR(100),
                      rarity_level VARCHAR(50)
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT
            b.badge_id,
            b.badge_name,
            b.rarity_level
        FROM
            user_badges ub
                JOIN
            badges b ON ub.badge_id = b.badge_id
        WHERE
                ub.user_id = user_id
          AND b.rarity_level = 'Rare';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE migrate_user_badges(source_user_id INT, target_user_id INT)
AS $$
BEGIN
    -- Migrate user's badges from the source user to the target user
    INSERT INTO user_badges (user_id, badge_id, progress_current, earned_at)
    SELECT
        target_user_id,
        badge_id,
        progress_current,
        earned_at
    FROM user_badges
    WHERE user_id = source_user_id;

    -- Optionally, you can remove badges from the source user after migration.
    -- DELETE FROM user_badges WHERE user_id = source_user_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE PROCEDURE notify_user_of_point_transfer_rejection(user_id INT, transfer_request_id INT)
AS $$
DECLARE
    rejection_reason TEXT;
BEGIN
    -- Retrieve the rejection reason from the point transfer request
    SELECT transfer_rejection_reason INTO rejection_reason
    FROM point_transfer_requests
    WHERE transfer_request_id = transfer_request_id;

    -- Implement your notification logic here, including sending the rejection reason.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE redeem_points_for_reward(user_id INT, reward_id INT, points_required INT)
AS $$
BEGIN
    -- Check if the user has enough points to redeem the reward
    DECLARE user_points INT;
    SELECT points INTO user_points
    FROM user_point_totals
    WHERE user_id = user_id;

    IF user_points >= points_required THEN
    -- Deduct points and record the redemption
    INSERT INTO point_usage_logs (user_id, points_change, transaction_reason)
    VALUES (user_id, -points_required, 'Reward Redemption');

    -- Add logic to grant the reward to the user here.
    ELSE
    -- Handle insufficient points situation (e.g., return an error or message).
    END IF;
    END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE reset_and_recalculate_badges(user_id INT)
AS $$
BEGIN
    -- Reset the user's badge progress
    UPDATE user_badges
    SET progress_current = 0
    WHERE user_id = user_id;

    -- Recalculate badge eligibility based on updated criteria
    -- Implement the badge recalculation logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE bulk_remove_badges_from_users(badge_id INT, user_ids INT[])
AS $$
BEGIN
    DELETE FROM user_badges
    WHERE badge_id = badge_id AND user_id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_point_transfer_limits(user_id INT, points_to_transfer INT, transfer_type VARCHAR(50))
    RETURNS BOOLEAN AS $$
DECLARE
    daily_limit INT;
    monthly_limit INT;
    total_daily_points INT;
    total_monthly_points INT;
BEGIN
    -- Retrieve user's point transfer limits
    SELECT
        daily_transfer_limit,
        monthly_transfer_limit
    INTO
        daily_limit,
        monthly_limit
    FROM
        user_point_transfer_limits
    WHERE
            user_id = user_id;

    -- Calculate the user's total daily and monthly transferred points
    SELECT
        COALESCE(SUM(points_change), 0)
    INTO
        total_daily_points
    FROM
        point_transfers
    WHERE
            sender_id = user_id
      AND transaction_reason = transfer_type
      AND transaction_timestamp >= CURRENT_DATE;

    SELECT
        COALESCE(SUM(points_change), 0)
    INTO
        total_monthly_points
    FROM
        point_transfers
    WHERE
            sender_id = user_id
      AND transaction_reason = transfer_type
      AND EXTRACT(MONTH FROM transaction_timestamp) = EXTRACT(MONTH FROM CURRENT_DATE);

    -- Check if the transfer exceeds daily or monthly limits
    RETURN
            (total_daily_points + points_to_transfer <= daily_limit) AND
            (total_monthly_points + points_to_transfer <= monthly_limit);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE bulk_transfer_points(sender_id INT, recipient_ids INT[], points INT, transfer_reason TEXT)
AS $$
BEGIN
    FOREACH recipient_id IN ARRAY recipient_ids
        LOOP
            INSERT INTO point_transfers (sender_id, receiver_id, points_change, transaction_reason)
            VALUES (sender_id, recipient_id, points, transfer_reason);
        END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE auto_assign_first_badge(user_id INT)
AS $$
BEGIN
    -- Assign the first badge to the user upon registration
    INSERT INTO user_badges (user_id, badge_id, progress_current, earned_at)
    VALUES (user_id, 1, 1, NOW());
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE notify_user_of_badge_completion(user_id INT, badge_id INT)
AS $$
BEGIN
    -- Implement your notification logic here, e.g., sending an email or push notification.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_point_earnings_history(user_id INT, limit INT)
    RETURNS TABLE (
                      transaction_id INT,
                      points_change INT,
                      transaction_reason TEXT,
                      transaction_details JSONB,
                      transaction_timestamp TIMESTAMPTZ
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT log_id, points_change, transaction_reason, transaction_details, transaction_timestamp
        FROM point_usage_logs
        WHERE user_id = user_id AND points_change > 0
        ORDER BY transaction_timestamp DESC
        LIMIT limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE bulk_redeem_points_for_rewards(user_id INT, reward_ids INT[])
AS $$
BEGIN
    FOREACH reward_id IN ARRAY reward_ids
        LOOP
            -- Check if the user has enough points to redeem the reward
            DECLARE required_points INT;
            SELECT points_required INTO required_points
        FROM rewards
        WHERE reward_id = reward_id;

            DECLARE user_points INT;
            SELECT points INTO user_points
        FROM user_point_totals
        WHERE user_id = user_id;

            IF user_points >= required_points THEN
            -- Deduct points and record the redemption
            INSERT INTO point_usage_logs (user_id, points_change, transaction_reason)
            VALUES (user_id, -required_points, 'Reward Redemption');

            -- Add logic to grant the reward to the user here.
            END IF;
            END LOOP;
            END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION suggest_badges_for_user(user_id INT, limit INT)
    RETURNS TABLE (
                      badge_id INT,
                      badge_name VARCHAR(100),
                      badge_description TEXT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT b.badge_id, b.badge_name, b.badge_description
        FROM badges b
        WHERE NOT EXISTS (
            SELECT 1
            FROM user_badges ub
            WHERE ub.user_id = user_id AND ub.badge_id = b.badge_id
        )
        -- Implement your badge suggestion logic here (e.g., based on user activity).
        LIMIT limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE share_badge_with_user(user_id INT, recipient_email TEXT, badge_id INT)
AS $$
BEGIN
    -- Implement badge sharing logic, e.g., send an email to the recipient with a badge link.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE activate_point_multiplier(user_id INT, multiplier_factor DECIMAL, duration INTERVAL)
AS $$
BEGIN
    -- Implement point multiplier activation logic, e.g., update user's point earning rates.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_point_redemption_history(user_id INT, limit INT)
    RETURNS TABLE (
                      redemption_id INT,
                      reward_id INT,
                      points_used INT,
                      redemption_timestamp TIMESTAMPTZ
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT redemption_id, reward_id, points_used, redemption_timestamp
        FROM point_redemptions
        WHERE user_id = user_id
        ORDER BY redemption_timestamp DESC
        LIMIT limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE rename_badge(badge_id INT, new_name VARCHAR(100))
AS $$
BEGIN
    UPDATE badges
    SET badge_name = new_name
    WHERE badge_id = badge_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_expired_badges(expiration_date TIMESTAMPTZ)
    RETURNS TABLE (
                      user_id INT,
                      badge_id INT,
                      badge_name VARCHAR(100),
                      expiration_date TIMESTAMPTZ
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT ub.user_id, ub.badge_id, b.badge_name, b.expiration_date
        FROM user_badges ub
                 JOIN badges b ON ub.badge_id = b.badge_id
        WHERE b.expiration_date <= expiration_date;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE convert_points_to_reward_currency(user_id INT, points INT, reward_currency_type VARCHAR(50))
AS $$
BEGIN
    -- Implement point conversion logic, e.g., deduct points and credit reward currency.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE send_point_reminder_notifications()
AS $$
BEGIN
    -- Implement the reminder notification logic, e.g., identify inactive users and send reminders.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE reset_badge_progress_for_inactive_users(inactivity_period INTERVAL)
AS $$
BEGIN
    -- Reset badge progress for users with no activity within the specified inactivity period.
    UPDATE user_badges
    SET progress_current = 0
    WHERE user_id IN (
        SELECT user_id
        FROM users
        WHERE last_activity_timestamp < NOW() - inactivity_period
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION badge_completion_analytics()
    RETURNS TABLE (
                      badge_id INT,
                      badge_name VARCHAR(100),
                      total_users INT,
                      completed_users INT,
                      completion_rate DECIMAL(5, 2)
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT
            b.badge_id,
            b.badge_name,
            COUNT(DISTINCT ub.user_id) AS total_users,
            SUM(CASE WHEN ub.progress_current = bc.criteria_value THEN 1 ELSE 0 END) AS completed_users,
            CASE
                WHEN COUNT(DISTINCT ub.user_id) > 0 THEN
                        (SUM(CASE WHEN ub.progress_current = bc.criteria_value THEN 1 ELSE 0 END) * 100.0) / COUNT(DISTINCT ub.user_id)
                ELSE
                    0
                END AS completion_rate
        FROM
            badges b
                LEFT JOIN
            user_badges ub ON b.badge_id = ub.badge_id
                LEFT JOIN
            badge_criteria bc ON b.badge_id = bc.badge_id
        GROUP BY
            b.badge_id, b.badge_name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE bulk_convert_points_to_reward_currencies(
    user_id INT,
    point_conversions JSONB[]
)
AS $$
DECLARE
    conversion_data JSONB;
BEGIN
    FOREACH conversion_data IN ARRAY point_conversions
        LOOP
        -- Extract conversion details from the JSON data and perform the conversion.
        -- Implement point conversion logic here.
        END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_point_activity_history(user_id INT, limit INT)
    RETURNS TABLE (
                      transaction_id INT,
                      points_change INT,
                      transaction_reason TEXT,
                      transaction_details JSONB,
                      transaction_timestamp TIMESTAMPTZ
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT log_id, points_change, transaction_reason, transaction_details, transaction_timestamp
        FROM point_usage_logs
        WHERE user_id = user_id
        ORDER BY transaction_timestamp DESC
        LIMIT limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION badge_sharing_analytics()
    RETURNS TABLE (
                      badge_id INT,
                      badge_name VARCHAR(100),
                      total_shares INT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT
            b.badge_id,
            b.badge_name,
            COUNT(DISTINCT us.user_id) AS total_shares
        FROM
            badges b
                LEFT JOIN
            user_shared_badges usb ON b.badge_id = usb.badge_id
                LEFT JOIN
            users us ON usb.user_id = us.user_id
        GROUP BY
            b.badge_id, b.badge_name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE send_badge_expiry_notifications(expiration_date TIMESTAMPTZ, notification_days INT)
AS $$
BEGIN
    -- Send notifications to users whose badges are expiring in 'notification_days' days.
    -- Implement notification logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE promote_users_to_higher_point_tier()
AS $$
BEGIN
    -- Identify users who have reached the required points threshold for promotion.
    -- Update user's point tier accordingly.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE reverse_point_transaction(transaction_id INT)
AS $$
BEGIN
    -- Reverse the specified point transaction and update user point totals.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE send_badge_removal_notification(user_id INT, badge_id INT, removal_reason TEXT)
AS $$
BEGIN
    -- Send a notification to the user explaining the badge removal and the reason.
    -- Implement notification logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE award_group_completion_badge(user_id INT, badge_group_id INT)
AS $$
BEGIN
    -- Check if the user has completed all badges within the specified group.
    -- If so, award the "Group Completion" badge.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE donate_points_to_charity(user_id INT, charity_id INT, points_donated INT)
AS $$
BEGIN
    -- Deduct points from the user's account and record the donation for the selected charity.
    -- Implement point donation logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_point_leaderboard(limit INT)
    RETURNS TABLE (
                      user_id INT,
                      username VARCHAR(100),
                      total_points INT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT u.user_id, u.username, COALESCE(upt.total_points, 0) AS total_points
        FROM users u
                 LEFT JOIN user_point_totals upt ON u.user_id = upt.user_id
        ORDER BY COALESCE(upt.total_points, 0) DESC
        LIMIT limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE verify_user_badge(user_id INT, badge_id INT)
AS $$
BEGIN
    -- Verify the specified badge for the user.
    -- Implement badge verification logic here, e.g., update badge status to "verified."
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE transfer_badge_to_user(sender_id INT, recipient_id INT, badge_id INT)
AS $$
BEGIN
    -- Transfer ownership of the specified badge from sender to recipient.
    -- Update badge ownership records accordingly.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE send_point_threshold_alert(user_id INT, threshold_points INT)
AS $$
BEGIN
    -- Send a notification to the user when they reach the specified point threshold.
    -- Encourage user engagement or provide rewards for reaching milestones.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE adjust_user_points(user_id INT, points_adjustment INT, adjustment_reason TEXT)
AS $$
BEGIN
    -- Adjust the user's point balance based on the provided adjustment value and reason.
    -- Update user point totals accordingly.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE recolor_badge(badge_id INT, new_color_scheme VARCHAR(50))
AS $$
BEGIN
    -- Update the color scheme or appearance of the specified badge.
    -- Implement badge recoloring logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE duplicate_badge(badge_id INT, new_badge_name VARCHAR(100))
AS $$
BEGIN
    -- Create a duplicate of the specified badge with a new name.
    -- Optionally, modify badge criteria or other attributes for the new badge.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE reconcile_point_balances(user_id INT)
AS $$
BEGIN
    -- Calculate the correct point balance for the user by reconciling earned and spent points.
    -- Update user point totals accordingly.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_expiring_points(expiration_date TIMESTAMPTZ, notification_days INT)
    RETURNS TABLE (
                      user_id INT,
                      points_to_expire INT,
                      expiration_date TIMESTAMPTZ
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT
            user_id,
            SUM(points_change) AS points_to_expire,
            expiration_date
        FROM
            point_usage_logs
        WHERE
                transaction_reason = 'Points Earned'
          AND transaction_timestamp >= NOW()
          AND transaction_timestamp <= NOW() + (notification_days || ' days')::INTERVAL
        GROUP BY
            user_id, expiration_date;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE create_badge_group(group_name VARCHAR(100), badge_ids INT[])
AS $$
DECLARE
    new_group_id INT;
BEGIN
    -- Create a new badge group.
    INSERT INTO badge_groups (group_name) VALUES (group_name) RETURNING group_id INTO new_group_id;

    -- Associate badges with the newly created group.
    FOREACH badge_id IN ARRAY badge_ids
        LOOP
            INSERT INTO badge_group_associations (group_id, badge_id) VALUES (new_group_id, badge_id);
        END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_badge_group_progress(user_id INT)
    RETURNS TABLE (
                      group_id INT,
                      group_name VARCHAR(100),
                      badges_completed INT,
                      total_badges INT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT
            bg.group_id,
            bg.group_name,
            COUNT(uba.badge_id) AS badges_completed,
            (SELECT COUNT(*) FROM badge_group_associations bga WHERE bga.group_id = bg.group_id) AS total_badges
        FROM
            badge_groups bg
                LEFT JOIN
            badge_group_associations bga ON bg.group_id = bga.group_id
                LEFT JOIN
            user_badges uba ON bga.badge_id = uba.badge_id AND uba.user_id = user_id
        GROUP BY
            bg.group_id, bg.group_name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE claim_reward_with_points(user_id INT, reward_id INT)
AS $$
BEGIN
    -- Check if the user has enough points to claim the specified reward.
    -- Deduct points and grant the reward to the user if eligible.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION export_point_history_to_csv(user_id INT)
    RETURNS TEXT AS $$
DECLARE
    csv_content TEXT;
BEGIN
    -- Generate CSV content with point history data.
    -- Save the content to a file or return it for download.
    csv_content := 'Transaction ID,Points Change,Reason,Details,Transaction Timestamp\n';

    FOR point_transaction IN (SELECT log_id, points_change, transaction_reason, transaction_details, transaction_timestamp FROM point_usage_logs WHERE user_id = user_id)
        LOOP
            csv_content := csv_content || point_transaction.log_id || ',' || point_transaction.points_change || ',' || point_transaction.transaction_reason || ',' || point_transaction.transaction_details || ',' || point_transaction.transaction_timestamp || '\n';
        END LOOP;

    RETURN csv_content;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE send_group_completion_notification(user_id INT, group_id INT)
AS $$
BEGIN
    -- Send a congratulatory notification to the user when they complete all badges in the group.
    -- Implement notification logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE reset_badge_group_progress(user_id INT, group_id INT)
AS $$
BEGIN
    -- Reset the progress of all badges within the specified group for the user.
    -- Implement badge group progress reset logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_point_leaderboard_for_group(group_id INT, limit INT)
    RETURNS TABLE (
                      user_id INT,
                      username VARCHAR(100),
                      total_points INT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT u.user_id, u.username, COALESCE(upt.total_points, 0) AS total_points
        FROM users u
                 LEFT JOIN user_point_totals upt ON u.user_id = upt.user_id
        WHERE u.group_id = group_id
        ORDER BY COALESCE(upt.total_points, 0) DESC
        LIMIT limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE reward_users_for_point_milestone(user_id INT, points_earned INT)
AS $$
BEGIN
    -- Check if the user has reached a predefined point milestone and grant corresponding rewards.
    -- Implement point milestone reward logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE exclude_user_from_badge(user_id INT, badge_id INT, exclusion_reason TEXT)
AS $$
BEGIN
    -- Exclude the user from earning the specified badge and record the reason for exclusion.
    -- Implement exclusion logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION search_badges_by_keyword(keyword VARCHAR(100))
    RETURNS TABLE (
                      badge_id INT,
                      badge_name VARCHAR(100),
                      badge_description TEXT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT badge_id, badge_name, badge_description
        FROM badges
        WHERE badge_name ILIKE '%' || keyword || '%' OR badge_description ILIKE '%' || keyword || '%';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE adjust_point_exchange_rate(new_exchange_rate DECIMAL(10, 2))
AS $$
BEGIN
    -- Update the point exchange rate for converting points to rewards.
    -- Implement exchange rate adjustment logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE redeem_points_for_gift_card(user_id INT, points_to_redeem INT, gift_card_code VARCHAR(50))
AS $$
BEGIN
    -- Deduct points from the user's account and issue a gift card with the specified code.
    -- Implement gift card redemption logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE auto_complete_badge_group(user_id INT, group_id INT)
AS $$
BEGIN
    -- Check if the user has earned all badges within the specified group.
    -- If so, mark the group as completed.
    -- Implement auto-completion logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE import_badges_from_csv(file_path TEXT)
AS $$
BEGIN
    -- Import badge data from a CSV file into the database.
    -- Implement import logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION export_badges_to_csv()
    RETURNS TEXT AS $$
DECLARE
    csv_content TEXT;
BEGIN
    -- Export badge data to a CSV file format.
    -- Generate CSV content and return it for download.
    -- Implement export logic here.
    RETURN csv_content;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE transfer_points_to_user(sender_id INT, recipient_id INT, points_to_transfer INT)
AS $$
BEGIN
    -- Transfer points from the sender to the recipient's account.
    -- Implement point transfer logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_point_usage_statistics()
    RETURNS TABLE (
                      transaction_reason TEXT,
                      total_points_used INT,
                      transaction_count INT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT
            transaction_reason,
            SUM(points_change) AS total_points_used,
            COUNT(*) AS transaction_count
        FROM
            point_usage_logs
        WHERE
                points_change < 0
        GROUP BY
            transaction_reason;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE create_roadmap_workflow(
    roadmap_workflow_name VARCHAR(100),
    description TEXT
)
AS $$
BEGIN
    INSERT INTO roadmap_workflow (name, description)
    VALUES (roadmap_workflow_name, description);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE add_task_to_roadmap_workflow(
    roadmap_workflow_id INT,
    task_name VARCHAR(100),
    task_description TEXT,
    due_date DATE
)
AS $$
BEGIN
    INSERT INTO roadmap_workflow_tasks (roadmap_workflow_id, name, description, due_date)
    VALUES (roadmap_workflow_id, task_name, task_description, due_date);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE mark_task_completed(task_id INT)
AS $$
BEGIN
    UPDATE roadmap_workflow_tasks
    SET completed = true
    WHERE task_id = task_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_tasks_for_roadmap_workflow(roadmap_workflow_id INT)
    RETURNS TABLE (
                      task_id INT,
                      name VARCHAR(100),
                      description TEXT,
                      due_date DATE,
                      completed BOOLEAN
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT task_id, name, description, due_date, completed
        FROM roadmap_workflow_tasks
        WHERE roadmap_workflow_id = roadmap_workflow_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE update_task_details(
    task_id INT,
    task_name VARCHAR(100),
    task_description TEXT,
    due_date DATE
)
AS $$
BEGIN
    UPDATE roadmap_workflow_tasks
    SET
        name = task_name,
        description = task_description,
        due_date = due_date
    WHERE
            task_id = task_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE delete_task(task_id INT)
AS $$
BEGIN
    DELETE FROM roadmap_workflow_tasks WHERE task_id = task_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE create_approval_process(
    approval_process_name VARCHAR(100),
    description TEXT
)
AS $$
BEGIN
    INSERT INTO approval_processes (name, description)
    VALUES (approval_process_name, description);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE add_step_to_approval_process(
    approval_process_id INT,
    step_name VARCHAR(100),
    approver_id INT
)
AS $$
BEGIN
    INSERT INTO approval_process_steps (approval_process_id, name, approver_id)
    VALUES (approval_process_id, step_name, approver_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE complete_approval_step(step_id INT, comments TEXT)
AS $$
BEGIN
    UPDATE approval_process_steps
    SET
        completed = true,
        completion_comments = comments,
        completion_timestamp = NOW()
    WHERE
            step_id = step_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_steps_for_approval_process(approval_process_id INT)
    RETURNS TABLE (
                      step_id INT,
                      name VARCHAR(100),
                      approver_id INT,
                      completed BOOLEAN,
                      completion_comments TEXT,
                      completion_timestamp TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT step_id, name, approver_id, completed, completion_comments, completion_timestamp
        FROM approval_process_steps
        WHERE approval_process_id = approval_process_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE reorder_tasks(task_ids INT[])
AS $$
DECLARE
    task_id INT;
    position INT;
BEGIN
    FOR task_id, position IN ARRAY task_ids
        LOOP
            UPDATE roadmap_workflow_tasks
            SET task_order = position
            WHERE task_id = task_id;
        END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_overdue_tasks()
    RETURNS TABLE (
                      task_id INT,
                      name VARCHAR(100),
                      description TEXT,
                      due_date DATE
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT task_id, name, description, due_date
        FROM roadmap_workflow_tasks
        WHERE due_date < CURRENT_DATE AND completed = false;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_active_approval_processes()
    RETURNS TABLE (
                      process_id INT,
                      name VARCHAR(100),
                      description TEXT
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT process_id, name, description
        FROM approval_processes
        WHERE completed = false;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE cancel_approval_process(process_id INT, cancellation_reason TEXT)
AS $$
BEGIN
    UPDATE approval_processes
    SET
        completed = true,
        cancellation_reason = cancellation_reason,
        completion_timestamp = NOW()
    WHERE
            process_id = process_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_completed_tasks()
    RETURNS TABLE (
                      task_id INT,
                      name VARCHAR(100),
                      description TEXT,
                      due_date DATE
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT task_id, name, description, due_date
        FROM roadmap_workflow_tasks
        WHERE completed = true;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_tasks_by_assignee(assignee_id INT)
    RETURNS TABLE (
                      task_id INT,
                      name VARCHAR(100),
                      description TEXT,
                      due_date DATE
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT task_id, name, description, due_date
        FROM roadmap_workflow_tasks
        WHERE assigned_to = assignee_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_approval_steps_for_user(approver_id INT)
    RETURNS TABLE (
                      step_id INT,
                      process_name VARCHAR(100),
                      step_name VARCHAR(100),
                      approval_comments TEXT
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT aps.step_id, ap.name AS process_name, aps.name AS step_name, aps.approval_comments
        FROM approval_process_steps aps
                 JOIN approval_processes ap ON aps.approval_process_id = ap.process_id
        WHERE aps.approver_id = approver_id AND aps.completed = false;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE approve_or_reject_step(step_id INT, approval_status BOOLEAN, comments TEXT)
AS $$
BEGIN
    UPDATE approval_process_steps
    SET
        completed = true,
        approval_status = approval_status,
        approval_comments = comments,
        completion_timestamp = NOW()
    WHERE
            step_id = step_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE set_task_dependencies(
    task_id INT,
    dependent_task_ids INT[]
)
AS $$
BEGIN
    -- Define dependencies between the specified task and dependent tasks.
    -- Implement task dependency logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_task_dependencies(task_id INT)
    RETURNS TABLE (
        dependent_task_id INT
                  )
AS $$
BEGIN
    -- Retrieve the task dependencies for the specified task.
    -- Implement task dependency retrieval logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE escalate_approval_step(step_id INT, escalated_to INT, escalation_reason TEXT)
AS $$
BEGIN
    -- Escalate the approval step to a higher authority.
    -- Implement approval step escalation logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_escalated_approval_steps(escalated_to INT)
    RETURNS TABLE (
                      step_id INT,
                      process_name VARCHAR(100),
                      step_name VARCHAR(100),
                      escalation_reason TEXT
                  )
AS $$
BEGIN
    -- Retrieve approval steps that have been escalated to the specified authority.
    -- Implement escalated approval step retrieval logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE reassign_task(
    task_id INT,
    new_assignee_id INT
)
AS $$
BEGIN
    -- Reassign the specified task to a new assignee.
    -- Implement task reassignment logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_tasks_by_status(status VARCHAR(50))
    RETURNS TABLE (
                      task_id INT,
                      name VARCHAR(100),
                      description TEXT,
                      due_date DATE
                  )
AS $$
BEGIN
    -- Retrieve tasks with the specified status.
    -- Implement task status retrieval logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE reassign_approval_step(
    step_id INT,
    new_approver_id INT
)
AS $$
BEGIN
    -- Reassign the specified approval step to a new approver.
    -- Implement approval step reassignment logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_completed_approval_steps(approval_process_id INT)
    RETURNS TABLE (
                      step_id INT,
                      step_name VARCHAR(100),
                      completion_timestamp TIMESTAMPTZ
                  )
AS $$
BEGIN
    -- Retrieve completed approval steps within the specified approval process.
    -- Implement completed approval step retrieval logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE update_task_priority(
    task_id INT,
    new_priority INT
)
AS $$
BEGIN
    -- Update the priority of the specified task.
    -- Implement task priority update logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_tasks_by_priority(priority INT)
    RETURNS TABLE (
                      task_id INT,
                      name VARCHAR(100),
                      description TEXT,
                      due_date DATE
                  )
AS $$
BEGIN
    -- Retrieve tasks with the specified priority.
    -- Implement task priority retrieval logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE send_process_completion_notification(
    process_id INT,
    completed_by INT
)
AS $$
BEGIN
    -- Send a notification when an approval process is completed.
    -- Implement completion notification logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_active_approval_steps_by_approver(approver_id INT)
    RETURNS TABLE (
                      step_id INT,
                      process_name VARCHAR(100),
                      step_name VARCHAR(100),
                      approval_comments TEXT
                  )
AS $$
BEGIN
    -- Retrieve active approval steps assigned to the specified approver.
    -- Implement active approval step retrieval logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE extend_task_deadline(
    task_id INT,
    new_due_date DATE
)
AS $$
BEGIN
    -- Extend the deadline of the specified task.
    -- Implement task deadline extension logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_tasks_by_category(category VARCHAR(100))
    RETURNS TABLE (
                      task_id INT,
                      name VARCHAR(100),
                      description TEXT,
                      due_date DATE
                  )
AS $$
BEGIN
    -- Retrieve tasks with the specified category.
    -- Implement task category retrieval logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE suspend_approval_process(
    process_id INT,
    suspension_reason TEXT
)
AS $$
BEGIN
    -- Suspend the specified approval process.
    -- Implement approval process suspension logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_approval_processes_by_status(status VARCHAR(50))
    RETURNS TABLE (
                      process_id INT,
                      name VARCHAR(100),
                      description TEXT
                  )
AS $$
BEGIN
    -- Retrieve approval processes with the specified status.
    -- Implement approval process status retrieval logic here.
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE create_approval_workflow_stage(
    stage_name VARCHAR(50) NOT NULL,
    description TEXT
)
AS $$
BEGIN
    INSERT INTO approval_workflow_stages (stage_name, description)
    VALUES (stage_name, description);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE update_approval_workflow_stage(
    stage_id INT,
    stage_name VARCHAR(50) NOT NULL,
    description TEXT
)
AS $$
BEGIN
    UPDATE approval_workflow_stages
    SET
        stage_name = stage_name,
        description = description
    WHERE
            stage_id = stage_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE delete_approval_workflow_stage(stage_id INT)
AS $$
BEGIN
    DELETE FROM approval_workflow_stages WHERE stage_id = stage_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_approval_workflow_stages()
    RETURNS TABLE (
                      stage_id INT,
                      stage_name VARCHAR(50),
                      description TEXT,
                      created_at TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT stage_id, stage_name, description, created_at
        FROM approval_workflow_stages;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE create_approval_request(
    user_id INT,
    task_id INT,
    item_id INT,
    stage_id INT,
    request_text TEXT
)
AS $$
BEGIN
    INSERT INTO approval_requests (user_id, task_id, item_id, stage_id, request_text)
    VALUES (user_id, task_id, item_id, stage_id, request_text);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE update_approval_request_status(
    request_id INT,
    new_status VARCHAR(20)
)
AS $$
BEGIN
    UPDATE approval_requests
    SET status = new_status
    WHERE request_id = request_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE create_approval_decision(
    request_id INT,
    approver_id INT,
    decision_text TEXT,
    decision_status VARCHAR(20)
)
AS $$
BEGIN
    INSERT INTO approval_decisions (request_id, approver_id, decision_text, decision_status)
    VALUES (request_id, approver_id, decision_text, decision_status);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_approval_request_decisions(request_id INT)
    RETURNS TABLE (
                      decision_id INT,
                      approver_id INT,
                      decision_text TEXT,
                      decision_status VARCHAR(20),
                      created_at TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT decision_id, approver_id, decision_text, decision_status, created_at
        FROM approval_decisions
        WHERE request_id = request_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_approval_workflow_stage_by_id(stage_id INT)
    RETURNS TABLE (
                      stage_name VARCHAR(50),
                      description TEXT,
                      created_at TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT stage_name, description, created_at
        FROM approval_workflow_stages
        WHERE stage_id = stage_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE create_approval_process_log(
    request_id INT,
    from_stage_id INT,
    to_stage_id INT,
    log_text TEXT
)
AS $$
BEGIN
    INSERT INTO approval_process_logs (request_id, from_stage_id, to_stage_id, log_text)
    VALUES (request_id, from_stage_id, to_stage_id, log_text);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_approval_process_logs(request_id INT)
    RETURNS TABLE (
                      log_id INT,
                      from_stage_id INT,
                      to_stage_id INT,
                      log_text TEXT,
                      log_timestamp TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT log_id, from_stage_id, to_stage_id, log_text, log_timestamp
        FROM approval_process_logs
        WHERE request_id = request_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_approval_workflow_permissions(user_id INT)
    RETURNS TABLE (
                      permission_id INT,
                      stage_id INT,
                      created_at TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT permission_id, stage_id, created_at
        FROM approval_workflow_permissions
        WHERE user_id = user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_approval_workflow_stages_count()
    RETURNS INT
AS $$
DECLARE
    stage_count INT;
BEGIN
    SELECT COUNT(*) INTO stage_count
    FROM approval_workflow_stages;
    RETURN stage_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_approval_requests_by_user(user_id INT)
    RETURNS TABLE (
                      request_id INT,
                      task_id INT,
                      item_id INT,
                      stage_id INT,
                      request_text TEXT,
                      status VARCHAR(20),
                      created_at TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT request_id, task_id, item_id, stage_id, request_text, status, created_at
        FROM approval_requests
        WHERE user_id = user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_approval_requests_by_status(status VARCHAR(20))
    RETURNS TABLE (
                      request_id INT,
                      user_id INT,
                      task_id INT,
                      item_id INT,
                      stage_id INT,
                      request_text TEXT,
                      created_at TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT request_id, user_id, task_id, item_id, stage_id, request_text, created_at
        FROM approval_requests
        WHERE status = status;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_approval_stages_by_description_keyword(keyword TEXT)
    RETURNS TABLE (
                      stage_id INT,
                      stage_name VARCHAR(50),
                      description TEXT,
                      created_at TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT stage_id, stage_name, description, created_at
        FROM approval_workflow_stages
        WHERE description ILIKE '%' || keyword || '%';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_pending_approval_requests_by_user(user_id INT)
    RETURNS TABLE (
                      request_id INT,
                      task_id INT,
                      item_id INT,
                      stage_id INT,
                      request_text TEXT,
                      created_at TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT request_id, task_id, item_id, stage_id, request_text, created_at
        FROM approval_requests
        WHERE user_id = user_id AND status = 'Pending';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_approval_process_logs_by_request(request_id INT)
    RETURNS TABLE (
                      log_id INT,
                      from_stage_id INT,
                      to_stage_id INT,
                      log_text TEXT,
                      log_timestamp TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT log_id, from_stage_id, to_stage_id, log_text, log_timestamp
        FROM approval_process_logs
        WHERE request_id = request_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_approval_stages_created_after(date_created TIMESTAMPTZ)
    RETURNS TABLE (
                      stage_id INT,
                      stage_name VARCHAR(50),
                      description TEXT,
                      created_at TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT stage_id, stage_name, description, created_at
        FROM approval_workflow_stages
        WHERE created_at > date_created;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_approval_requests_by_stage(stage_id INT)
    RETURNS TABLE (
                      request_id INT,
                      user_id INT,
                      task_id INT,
                      item_id INT,
                      request_text TEXT,
                      status VARCHAR(20),
                      created_at TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT request_id, user_id, task_id, item_id, request_text, status, created_at
        FROM approval_requests
        WHERE stage_id = stage_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_approval_process_logs_between_dates(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
    RETURNS TABLE (
                      log_id INT,
                      request_id INT,
                      from_stage_id INT,
                      to_stage_id INT,
                      log_text TEXT,
                      log_timestamp TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT log_id, request_id, from_stage_id, to_stage_id, log_text, log_timestamp
        FROM approval_process_logs
        WHERE log_timestamp >= start_date AND log_timestamp <= end_date;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_approval_stages_modified_after(date_modified TIMESTAMPTZ)
    RETURNS TABLE (
                      stage_id INT,
                      stage_name VARCHAR(50),
                      description TEXT,
                      created_at TIMESTAMPTZ,
                      modified_at TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT stage_id, stage_name, description, created_at, modified_at
        FROM approval_workflow_stages
        WHERE modified_at > date_modified;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_approval_requests_by_user_and_status(user_id INT, status VARCHAR(20))
    RETURNS TABLE (
                      request_id INT,
                      task_id INT,
                      item_id INT,
                      stage_id INT,
                      request_text TEXT,
                      created_at TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT request_id, task_id, item_id, stage_id, request_text, created_at
        FROM approval_requests
        WHERE user_id = user_id AND status = status;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_approval_process_logs_by_stage(stage_id INT)
    RETURNS TABLE (
                      log_id INT,
                      request_id INT,
                      from_stage_id INT,
                      to_stage_id INT,
                      log_text TEXT,
                      log_timestamp TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT log_id, request_id, from_stage_id, to_stage_id, log_text, log_timestamp
        FROM approval_process_logs
        WHERE from_stage_id = stage_id OR to_stage_id = stage_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE delete_all_approval_requests_for_user(user_id INT)
AS $$
BEGIN
    DELETE FROM approval_requests WHERE user_id = user_id;
END;
$$ LANGUAGE plpgsql;


