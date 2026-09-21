--
-- Who each task moved between. The first row for a task has no
-- PreviousUserUUID, and the last row here has no NewUserUUID -- that is an
-- unassignment, which is why both ends are nullable.
--

INSERT INTO "dbo"."AssignmentHistory" ("AssignmentHistoryUUID", "TaskUUID", "PreviousUserUUID", "NewUserUUID", "AssignedAt", "CreatedBy") VALUES
    ('1a000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', NULL,                                   'b0000000-0000-4000-8000-000000000002', '2025-03-01 08:00:00+00', 'seed'),
    ('1a000000-0000-4000-8000-000000000002', '16000000-0000-4000-8000-000000000002', NULL,                                   'b0000000-0000-4000-8000-000000000002', '2025-03-30 08:00:00+00', 'seed'),
    ('1a000000-0000-4000-8000-000000000003', '16000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', '2025-04-04 08:00:00+00', 'seed'),
    ('1a000000-0000-4000-8000-000000000004', '16000000-0000-4000-8000-000000000003', NULL,                                   'b0000000-0000-4000-8000-000000000004', '2025-04-10 08:00:00+00', 'seed'),
    ('1a000000-0000-4000-8000-000000000005', '16000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000006', NULL,                                   '2025-05-12 08:00:00+00', 'seed')
ON CONFLICT ("AssignmentHistoryUUID") DO UPDATE SET
    "PreviousUserUUID" = EXCLUDED."PreviousUserUUID",
    "NewUserUUID" = EXCLUDED."NewUserUUID",
    "AssignedAt" = EXCLUDED."AssignedAt",
    "UpdatedBy" = 'seed';
