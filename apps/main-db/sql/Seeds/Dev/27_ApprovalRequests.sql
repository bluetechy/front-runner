--
-- Running requests, one per state worth looking at: waiting at the first
-- stage, waiting at the second, finished and approved, finished and rejected,
-- and one escalated.
--
-- Each row approves exactly one thing -- the table's check constraint allows
-- only one of TaskUUID, PointRedemptionUUID and PointTransferUUID to be set.
-- Between them these cover all three subjects.
--
-- A finished request has a NULL CurrentStageUUID: it is out of the stages, and
-- Status carries the outcome.
--

INSERT INTO "dbo"."ApprovalRequests" ("ApprovalRequestUUID", "OrganizationUUID", "ApprovalWorkflowUUID", "CurrentStageUUID", "RequestedByUserUUID", "RequestText", "Status", "TaskUUID", "PointRedemptionUUID", "PointTransferUUID", "EscalatedToUserUUID", "EscalatedAt", "EscalationReason", "CreatedBy") VALUES
    ('20000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Conference ticket, please.', 'Pending',  NULL,                                   '13000000-0000-4000-8000-000000000002', NULL,                                   NULL,                                   NULL,                     NULL,                        'seed'),
    ('20000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'Standing desk.',             'Pending',  NULL,                                   '13000000-0000-4000-8000-000000000003', NULL,                                   NULL,                                   NULL,                     NULL,                        'seed'),
    ('20000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000001', NULL,                                   'b0000000-0000-4000-8000-000000000002', 'Coffee shop voucher.',       'Approved', NULL,                                   '13000000-0000-4000-8000-000000000001', NULL,                                   NULL,                                   NULL,                     NULL,                        'seed'),
    ('20000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000001', NULL,                                   'b0000000-0000-4000-8000-000000000004', 'More than he holds.',        'Rejected', NULL,                                   '13000000-0000-4000-8000-000000000004', NULL,                                   NULL,                                   NULL,                     NULL,                        'seed'),
    ('20000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002', '1e000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'Sign off the API work.',     'Pending',  '16000000-0000-4000-8000-000000000002', NULL,                                   NULL,                                   NULL,                                   NULL,                     NULL,                        'seed'),
    ('20000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000004', 'Transfer to Thanh.',         'Pending',  NULL,                                   NULL,                                   '14000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', '2025-06-20 09:00:00+00', 'No answer for two weeks.',  'seed'),
    ('20000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000002', '1d000000-0000-4000-8000-000000000004', '1e000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000003', 'Team lunch.',                'Pending',  NULL,                                   '13000000-0000-4000-8000-000000000006', NULL,                                   NULL,                                   NULL,                     NULL,                        'seed')
ON CONFLICT ("ApprovalRequestUUID") DO UPDATE SET
    "CurrentStageUUID" = EXCLUDED."CurrentStageUUID",
    "RequestText" = EXCLUDED."RequestText",
    "Status" = EXCLUDED."Status",
    "TaskUUID" = EXCLUDED."TaskUUID",
    "PointRedemptionUUID" = EXCLUDED."PointRedemptionUUID",
    "PointTransferUUID" = EXCLUDED."PointTransferUUID",
    "EscalatedToUserUUID" = EXCLUDED."EscalatedToUserUUID",
    "EscalatedAt" = EXCLUDED."EscalatedAt",
    "EscalationReason" = EXCLUDED."EscalationReason",
    "UpdatedBy" = 'seed';
