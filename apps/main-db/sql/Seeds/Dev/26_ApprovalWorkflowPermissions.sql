--
-- Who may decide where. Advisory only: dbo.ApprovalDecisions accepts a
-- decision from anybody, so whatever records one has to read this first. The
-- test TestApprovalDecisions_DoNotEnforceStagePermissions pins that down.
--

INSERT INTO "dbo"."ApprovalWorkflowPermissions" ("ApprovalWorkflowPermissionUUID", "ApprovalWorkflowStageUUID", "UserUUID", "CreatedBy") VALUES
    ('1f000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'seed'),
    ('1f000000-0000-4000-8000-000000000002', '1e000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'seed'),
    ('1f000000-0000-4000-8000-000000000003', '1e000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'seed'),
    ('1f000000-0000-4000-8000-000000000004', '1e000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000004', 'seed'),
    ('1f000000-0000-4000-8000-000000000005', '1e000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000005', 'seed')
ON CONFLICT ON CONSTRAINT "ApprovalWorkflowPermissions_UUIDs_UniqueKey" DO UPDATE SET
    "UpdatedBy" = 'seed';
