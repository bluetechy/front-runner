--
-- What users have been told. ReadAt separates seen from unseen, which is the
-- question the table exists to answer; several rows are deliberately unread.
-- Not every notification is about a task -- the draft assumed they all were.
--

INSERT INTO "dbo"."Notifications" ("NotificationUUID", "UserUUID", "OrganizationUUID", "TaskUUID", "NotificationType", "Message", "ReadAt", "CreatedBy") VALUES
    ('2b000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000002', 'Assigned',       'Build the API is yours.',            '2025-04-05 08:00:00+00', 'seed'),
    ('2b000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000003', 'Assigned',       'Build the GUI is yours.',            NULL,                     'seed'),
    ('2b000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000004', 'Overdue',        'Ship the release is past due.',      NULL,                     'seed'),
    ('2b000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', NULL,                                   'BadgeEarned',    'You earned a badge.',                '2025-03-13 08:00:00+00', 'seed'),
    ('2b000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', NULL,                                   'ApprovalNeeded', 'A redemption needs your sign-off.',  NULL,                     'seed'),
    ('2b000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', NULL,                                   'Rejected',       'Your redemption was turned down.',   NULL,                     'seed'),
    ('2b000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', NULL,                                   'Welcome',        'Welcome to Bluetechy Labs.',         '2025-02-06 08:00:00+00', 'seed')
ON CONFLICT ("NotificationUUID") DO UPDATE SET
    "TaskUUID" = EXCLUDED."TaskUUID",
    "NotificationType" = EXCLUDED."NotificationType",
    "Message" = EXCLUDED."Message",
    "ReadAt" = EXCLUDED."ReadAt",
    "UpdatedBy" = 'seed';
