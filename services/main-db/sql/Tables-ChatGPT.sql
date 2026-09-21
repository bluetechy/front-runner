CREATE TABLE roadmaps (
    roadmap_id serial PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
    task_id serial PRIMARY KEY,
    roadmap_id INT REFERENCES roadmaps(roadmap_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'Pending', -- You can use different status values (e.g., 'Completed', 'In Progress', etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_user_id INT REFERENCES users(user_id), -- Reference to the user assigned to the task
    dependency_id INT REFERENCES task_dependencies(dependency_id) -- Reference to task dependencies
);

CREATE TABLE task_dependencies (
    dependency_id serial PRIMARY KEY,
    dependent_task_id INT REFERENCES tasks(task_id),
    prerequisite_task_id INT REFERENCES tasks(task_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a table to store comments on tasks
CREATE TABLE task_comments (
    comment_id serial PRIMARY KEY,
    task_id INT REFERENCES tasks(task_id),
    user_id INT REFERENCES users(user_id),
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE labels (
    label_id serial PRIMARY KEY,
    label_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE attachments (
    attachment_id serial PRIMARY KEY,
    task_id INT REFERENCES tasks(task_id),
    comment_id INT REFERENCES task_comments(comment_id),
    file_path VARCHAR(255) NOT NULL,
    file_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assignment_history (
    assignment_id serial PRIMARY KEY,
    task_id INT REFERENCES tasks(task_id),
    previous_user_id INT,
    new_user_id INT,
    assigned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
    notification_id serial PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    task_id INT REFERENCES tasks(task_id),
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE checklists (
    checklist_id serial PRIMARY KEY,
    task_id INT REFERENCES tasks(task_id),
    item_text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_history (
    history_id serial PRIMARY KEY,
    task_id INT REFERENCES tasks(task_id),
    user_id INT,
    change_type VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
    role_id serial PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_log (
    event_id serial PRIMARY KEY,
    user_id INT,
    event_type VARCHAR(100) NOT NULL,
    event_description TEXT,
    event_timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activity_feed (
    activity_id serial PRIMARY KEY,
    user_id INT,
    activity_text TEXT NOT NULL,
    activity_timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE access_control_lists (
    acl_id serial PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    task_id INT REFERENCES tasks(task_id),
    permission_type VARCHAR(50) NOT NULL
);

CREATE TABLE approval_workflow_stages (
    stage_id serial PRIMARY KEY,
    stage_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE approval_requests (
    request_id serial PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    task_id INT REFERENCES tasks(task_id),
    item_id INT, -- Reference to the item being requested (if applicable)
    stage_id INT REFERENCES approval_workflow_stages(stage_id),
    request_text TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending', -- Status of the request (e.g., 'Pending', 'Approved', 'Rejected')
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE approval_decisions (
    decision_id serial PRIMARY KEY,
    request_id INT REFERENCES approval_requests(request_id),
    approver_id INT REFERENCES users(user_id),
    decision_text TEXT,
    decision_status VARCHAR(20) NOT NULL, -- 'Approve' or 'Reject'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE approval_process_logs (
    log_id serial PRIMARY KEY,
    request_id INT REFERENCES approval_requests(request_id),
    from_stage_id INT REFERENCES approval_workflow_stages(stage_id),
    to_stage_id INT REFERENCES approval_workflow_stages(stage_id),
    log_text TEXT,
    log_timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE approval_workflow_permissions (
    permission_id serial PRIMARY KEY,
    stage_id INT REFERENCES approval_workflow_stages(stage_id),
    user_id INT REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE surveys (
    survey_id serial PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE survey_questions (
    question_id serial PRIMARY KEY,
    survey_id INT REFERENCES surveys(survey_id),
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL, -- E.g., 'Multiple Choice', 'Open Text'
    question_order INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE survey_question_options (
    option_id serial PRIMARY KEY,
    question_id INT REFERENCES survey_questions(question_id),
    option_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE survey_responses (
    response_id serial PRIMARY KEY,
    survey_id INT REFERENCES surveys(survey_id),
    participant_id INT REFERENCES users(user_id), -- Reference to the participant
    response_data JSONB, -- Store responses as JSON for flexibility
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE survey_participants (
    participant_id serial PRIMARY KEY,
    survey_id INT REFERENCES surveys(survey_id),
    user_id INT REFERENCES users(user_id), -- Reference to the user participating
    invited_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE user_point_totals (
    user_id INT PRIMARY KEY REFERENCES users(user_id),
    point_type_id INT REFERENCES point_types(point_type_id),
    points INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_point_totals
    ADD COLUMN daily_limit INT, -- Daily point accumulation limit
    ADD COLUMN spend_limit INT; -- Point spending limit

CREATE TABLE point_types (
    point_type_id serial PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    description TEXT,
    expiration_duration INTERVAL, -- Point type-specific expiration duration
    reset_condition TEXT, -- Condition for resetting points
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE point_transactions (
    transaction_id serial PRIMARY KEY,
    user_id INT REFERENCES user_points(user_id),
    point_type_id INT REFERENCES point_types(point_type_id),
    points_change INT NOT NULL, -- Positive for adding points, negative for deductions
    transaction_reason TEXT NOT NULL,
    transaction_details JSONB, -- Store additional details as JSON
    transaction_timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE point_usage_logs (
    log_id serial PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    points_change INT NOT NULL, -- Positive for earning, negative for spending
    transaction_reason TEXT NOT NULL,
    transaction_details JSONB, -- Store additional details as JSON
    transaction_timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE point_redemptions (
    redemption_id serial PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    redeemed_points INT NOT NULL,
    redemption_description TEXT,
    redemption_status VARCHAR(20) NOT NULL, -- 'Pending', 'Approved', 'Rejected', etc.
    redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE point_transfers (
    transfer_id serial PRIMARY KEY,
    sender_user_id INT REFERENCES users(user_id),
    receiver_user_id INT REFERENCES users(user_id),
    transferred_points INT NOT NULL,
    transfer_description TEXT,
    transfer_timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE point_multipliers (
    multiplier_id serial PRIMARY KEY,
    multiplier_name VARCHAR(100) NOT NULL,
    multiplier_description TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    multiplier_factor DECIMAL(5,2) NOT NULL, -- Decimal representing the multiplier factor
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE point_levels (
    level_id serial PRIMARY KEY,
    level_name VARCHAR(50) NOT NULL,
    point_type_id INT REFERENCES point_types(point_type_id), -- Reference to the point type
    min_points INT NOT NULL, -- Minimum points required to reach this level
    reward_description TEXT, -- Description of rewards or benefits for reaching this level
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_point_levels (
    user_id INT REFERENCES users(user_id),
    point_type_id INT REFERENCES point_types(point_type_id), -- Reference to the point type
    level_id INT REFERENCES point_levels(level_id), -- Reference to the level
    reached_at TIMESTAMPTZ DEFAULT NOW()
);
/*
CREATE TABLE badges (
    badge_id serial PRIMARY KEY,
    badge_name VARCHAR(100) NOT NULL,
    description TEXT,
    badge_icon_url VARCHAR(255), -- URL to badge icon or image
    badge_category VARCHAR(50), -- Badge category
    badge_level INT, -- Badge level (if applicable)
    expiration_date TIMESTAMPTZ, -- Badge expiration date
    owner_user_id INT, -- Badge owner (if applicable)
    is_public BOOLEAN, -- Badge visibility
    badge_rarity VARCHAR(20), -- Badge rarity
    badge_value INT, -- Badge point value or worth
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE badge_achievements (
    achievement_id serial PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    badge_id INT REFERENCES badges(badge_id),
    milestone_description TEXT NOT NULL,
    milestone_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE badge_criteria (
    criteria_id serial PRIMARY KEY,
    badge_id INT REFERENCES badges(badge_id),
    criteria_description TEXT NOT NULL,
    criteria_type VARCHAR(50) NOT NULL, -- Type of criteria (e.g., 'Activity', 'Achievement')
    criteria_value INT NOT NULL, -- Value required for criteria completion
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE badge_categories (
    category_id serial PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    parent_category_id INT REFERENCES badge_categories(category_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE badge_events (
    event_id serial PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    event_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE badge_event_criteria (
    event_criteria_id serial PRIMARY KEY,
    event_id INT REFERENCES badge_events(event_id),
    badge_id INT REFERENCES badges(badge_id),
    criteria_description TEXT NOT NULL,
    -- Define specific criteria fields as needed
    -- Example: criteria_type VARCHAR(50), criteria_value INT, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE badge_groups (
    group_id serial PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE badge_group_relationships (
    relationship_id serial PRIMARY KEY,
    badge_id INT REFERENCES badges(badge_id),
    group_id INT REFERENCES badge_groups(group_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE badge_reviews (
    review_id serial PRIMARY KEY,
    badge_id INT REFERENCES badges(badge_id),
    user_id INT REFERENCES users(user_id),
    review_status VARCHAR(20) NOT NULL, -- 'Pending', 'Approved', 'Rejected', etc.
    review_comment TEXT, -- Comments or feedback from the reviewer
    reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE badge_statistics (
    statistic_id serial PRIMARY KEY,
    badge_id INT REFERENCES badges(badge_id),
    users_earned INT, -- Number of users who have earned this badge
    latest_earnings INT, -- Number of recent badge earnings
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shared_badges (
    shared_id serial PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    badge_id INT REFERENCES badges(badge_id),
    shared_with_user_id INT REFERENCES users(user_id),
    shared_at TIMESTAMPTZ DEFAULT NOW()
);
*/
CREATE TABLE user_badges (
    user_badge_id serial PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    badge_id INT REFERENCES badges(badge_id),
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    earned_description TEXT, -- Description of how the badge was earned
    progress_goal INT, -- Badge progress goal (if applicable)
    progress_current INT, -- Current progress toward earning the badge
    revoked_at TIMESTAMPTZ, -- Badge revocation date (if applicable)
    UNIQUE (user_id, badge_id) -- Ensure a user can only earn a badge once
);
