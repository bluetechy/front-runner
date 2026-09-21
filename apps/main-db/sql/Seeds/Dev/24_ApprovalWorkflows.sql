--
-- Two workflows in the main organization and one in the second. The template
-- side of approvals: 27_ApprovalRequests.sql holds the running instances.
--

INSERT INTO "dbo"."ApprovalWorkflows" ("ApprovalWorkflowUUID", "OrganizationUUID", "Name", "Description", "IsEnabled", "CreatedBy") VALUES
    ('1d000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Redemption',    'Signing off a point redemption.',      true,  'seed'),
    ('1d000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Task Sign-off', 'Closing a task that needs review.',    true,  'seed'),
    ('1d000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Legacy Review', 'Superseded, kept for old requests.',   false, 'seed'),
    ('1d000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002', 'Redemption',    'Same name, different organization.',   true,  'seed')
ON CONFLICT ("ApprovalWorkflowUUID") DO UPDATE SET
    "OrganizationUUID" = EXCLUDED."OrganizationUUID",
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "IsEnabled" = EXCLUDED."IsEnabled",
    "UpdatedBy" = 'seed';
