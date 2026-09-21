--
-- One row per approver per stage. Note what is missing: the two Pending
-- requests that already carry a Manager approval have not moved to the next
-- stage on their own. Recording a decision and advancing a request are
-- separate writes, and nothing here does the second one.
--

INSERT INTO "dbo"."ApprovalDecisions" ("ApprovalDecisionUUID", "ApprovalRequestUUID", "ApprovalWorkflowStageUUID", "ApproverUserUUID", "Status", "Comment", "DecidedAt", "CreatedBy") VALUES
    ('21000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '1e000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Approved', 'Reasonable ask.',        '2025-05-18 10:00:00+00', 'seed'),
    ('21000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', '1e000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Approved', 'Fine.',                  '2025-04-01 09:00:00+00', 'seed'),
    ('21000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', '1e000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'Approved', 'Within budget.',         '2025-04-02 09:00:00+00', 'seed'),
    ('21000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', '1e000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Approved', 'Happy if finance are.',  '2025-05-02 09:00:00+00', 'seed'),
    ('21000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000004', '1e000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'Rejected', 'Balance does not cover it.', '2025-05-03 09:00:00+00', 'seed'),
    ('21000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000006', '1e000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Approved', 'Passed upward.',         '2025-06-06 09:00:00+00', 'seed')
ON CONFLICT ON CONSTRAINT "ApprovalDecisions_UUIDs_UniqueKey" DO UPDATE SET
    "Status" = EXCLUDED."Status",
    "Comment" = EXCLUDED."Comment",
    "DecidedAt" = EXCLUDED."DecidedAt",
    "UpdatedBy" = 'seed';
