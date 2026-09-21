--
-- Change log. Nothing writes these automatically -- there is no trigger behind
-- dbo.TaskHistory the way calculate_tallies sits behind dbo.UserTallies -- so
-- these rows are here to show the shape a caller has to write. The last row
-- has no UserUUID: not every change has a person behind it.
--

INSERT INTO "dbo"."TaskHistory" ("TaskHistoryUUID", "TaskUUID", "UserUUID", "ChangeType", "OldValue", "NewValue", "ChangedAt", "CreatedBy") VALUES
    ('19000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Status',   'Pending',    'InProgress', '2025-03-02 09:00:00+00', 'seed'),
    ('19000000-0000-4000-8000-000000000002', '16000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Status',   'InProgress', 'Completed',  '2025-03-28 17:30:00+00', 'seed'),
    ('19000000-0000-4000-8000-000000000003', '16000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'Status',   'Pending',    'InProgress', '2025-04-05 10:15:00+00', 'seed'),
    ('19000000-0000-4000-8000-000000000004', '16000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', 'DueDate',  '2025-05-01', '2025-06-01', '2025-04-20 11:00:00+00', 'seed'),
    ('19000000-0000-4000-8000-000000000005', '16000000-0000-4000-8000-000000000007', NULL,                                   'Status',   'Pending',    'Cancelled',  '2025-04-30 00:00:00+00', 'seed')
ON CONFLICT ("TaskHistoryUUID") DO UPDATE SET
    "ChangeType" = EXCLUDED."ChangeType",
    "OldValue" = EXCLUDED."OldValue",
    "NewValue" = EXCLUDED."NewValue",
    "ChangedAt" = EXCLUDED."ChangedAt",
    "UpdatedBy" = 'seed';
