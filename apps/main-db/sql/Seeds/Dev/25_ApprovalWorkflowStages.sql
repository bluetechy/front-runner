--
-- The ordered steps of each workflow. SortOrder is the order a request passes
-- through them; nothing enforces that order -- see SCHEMA-NOTES.md.
--

INSERT INTO "dbo"."ApprovalWorkflowStages" ("ApprovalWorkflowStageUUID", "ApprovalWorkflowUUID", "Name", "Description", "SortOrder", "CreatedBy") VALUES
    ('1e000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000001', 'Manager', 'The requester''s manager.',    1, 'seed'),
    ('1e000000-0000-4000-8000-000000000002', '1d000000-0000-4000-8000-000000000001', 'Finance', 'Budget holder signs it off.',  2, 'seed'),
    ('1e000000-0000-4000-8000-000000000003', '1d000000-0000-4000-8000-000000000002', 'Review',  'A second pair of eyes.',       1, 'seed'),
    ('1e000000-0000-4000-8000-000000000004', '1d000000-0000-4000-8000-000000000004', 'Manager', 'Single stage in the lab.',     1, 'seed')
ON CONFLICT ("ApprovalWorkflowStageUUID") DO UPDATE SET
    "ApprovalWorkflowUUID" = EXCLUDED."ApprovalWorkflowUUID",
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "SortOrder" = EXCLUDED."SortOrder",
    "UpdatedBy" = 'seed';
