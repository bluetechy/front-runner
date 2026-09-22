--
-- What users have been told. ReadAt separates seen from unseen, which is the
-- question the table exists to answer; several rows are deliberately unread.
-- Not every notification is about a task -- the draft assumed they all were.
--
-- "CreatedAt" is written here, relative to the moment of the seed run, rather
-- than left to default. The bell in the GUI prints how long ago each one
-- arrived, so a dataset where everything was created at once has nothing to
-- show: these are minutes, hours and days old on a freshly seeded database.
-- They age from there, which is what a notification does.
--
-- The eight rows on testuser are the ones the bell is meant to be looked at
-- with -- it is the account the login dialog is exercised with, and it is the
-- only one seeded with enough notifications to make the menu scroll. Four of
-- them are unread, which is what the badge on the bell should say.
--

INSERT INTO "dbo"."Notifications" ("NotificationUUID", "UserUUID", "OrganizationUUID", "TaskUUID", "NotificationType", "Message", "ReadAt", "CreatedAt", "CreatedBy") VALUES
    ('2b000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000002', 'Assigned',        'Build the API is yours.',            CURRENT_TIMESTAMP - interval '2 days',   CURRENT_TIMESTAMP - interval '3 days',      'seed'),
    ('2b000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000003', 'Assigned',        'Build the GUI is yours.',            NULL,                                    CURRENT_TIMESTAMP - interval '3 days',      'seed'),
    ('2b000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000004', 'Overdue',         'Ship the release is past due.',      NULL,                                    CURRENT_TIMESTAMP - interval '4 hours',     'seed'),
    ('2b000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', NULL,                                   'BadgeEarned',     'You earned a badge.',                CURRENT_TIMESTAMP - interval '6 days',   CURRENT_TIMESTAMP - interval '7 days',      'seed'),
    ('2b000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', NULL,                                   'ApprovalNeeded',  'A redemption needs your sign-off.',  NULL,                                    CURRENT_TIMESTAMP - interval '90 minutes',  'seed'),
    ('2b000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', NULL,                                   'Rejected',        'Your redemption was turned down.',   NULL,                                    CURRENT_TIMESTAMP - interval '2 days',      'seed'),
    ('2b000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', NULL,                                   'Welcome',         'Welcome to Bluetechy Labs.',         CURRENT_TIMESTAMP - interval '20 days',  CURRENT_TIMESTAMP - interval '21 days',     'seed'),
    -- testuser, the account the bell is meant to be looked at with. Four of
    -- these eight are unread; the newest is minutes old and the oldest is a
    -- week, so the menu has both ends of the relative clock in it.
    ('2b000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-00000000000d', 'a0000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000002', 'Assigned',        'Ship the quarterly report is yours.', CURRENT_TIMESTAMP - interval '9 hours',  CURRENT_TIMESTAMP - interval '10 hours',   'seed'),
    ('2b000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-00000000000d', 'a0000000-0000-4000-8000-000000000001', NULL,                                   'UpdateAvailable', 'Updates available',                   NULL,                                    CURRENT_TIMESTAMP - interval '2 days',     'seed'),
    ('2b000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-00000000000d', 'a0000000-0000-4000-8000-000000000001', NULL,                                   'OrderReceived',   'New order received',                  NULL,                                    CURRENT_TIMESTAMP - interval '1 hour',     'seed'),
    ('2b000000-0000-4000-8000-00000000000b', 'b0000000-0000-4000-8000-00000000000d', 'a0000000-0000-4000-8000-000000000001', NULL,                                   'ReviewReceived',  'New review received',                 NULL,                                    CURRENT_TIMESTAMP - interval '1 day',      'seed'),
    ('2b000000-0000-4000-8000-00000000000c', 'b0000000-0000-4000-8000-00000000000d', 'a0000000-0000-4000-8000-000000000001', NULL,                                   'Registrations',   '22 verified registrations',           NULL,                                    CURRENT_TIMESTAMP - interval '2 hours',    'seed'),
    ('2b000000-0000-4000-8000-00000000000d', 'b0000000-0000-4000-8000-00000000000d', 'a0000000-0000-4000-8000-000000000001', NULL,                                   'BadgeEarned',     'You earned the Trailblazer badge.',   CURRENT_TIMESTAMP - interval '2 days',   CURRENT_TIMESTAMP - interval '3 days',     'seed'),
    ('2b000000-0000-4000-8000-00000000000e', 'b0000000-0000-4000-8000-00000000000d', 'a0000000-0000-4000-8000-000000000001', NULL,                                   'LevelReached',    'You reached level four.',             CURRENT_TIMESTAMP - interval '4 days',   CURRENT_TIMESTAMP - interval '5 days',     'seed'),
    ('2b000000-0000-4000-8000-00000000000f', 'b0000000-0000-4000-8000-00000000000d', 'a0000000-0000-4000-8000-000000000001', NULL,                                   'Welcome',         'Welcome to Northwind Trading.',       CURRENT_TIMESTAMP - interval '6 days',   CURRENT_TIMESTAMP - interval '7 days',     'seed')
ON CONFLICT ("NotificationUUID") DO UPDATE SET
    "TaskUUID" = EXCLUDED."TaskUUID",
    "NotificationType" = EXCLUDED."NotificationType",
    "Message" = EXCLUDED."Message",
    "ReadAt" = EXCLUDED."ReadAt",
    "UpdatedBy" = 'seed';
