--
-- Checklist items, one row each. The completed task's list is fully ticked and
-- the in-progress one is half done, so a progress reader has both. Nothing
-- reconciles a task's Status with its checklist -- the cancelled task below
-- still has unticked items on purpose.
--

INSERT INTO "dbo"."Checklists" ("ChecklistUUID", "TaskUUID", "Description", "IsCompleted", "SortOrder", "CreatedBy") VALUES
    ('1b000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', 'Draft the tables.',      true,  1, 'seed'),
    ('1b000000-0000-4000-8000-000000000002', '16000000-0000-4000-8000-000000000001', 'Add the triggers.',      true,  2, 'seed'),
    ('1b000000-0000-4000-8000-000000000003', '16000000-0000-4000-8000-000000000001', 'Write the tests.',       true,  3, 'seed'),
    ('1b000000-0000-4000-8000-000000000004', '16000000-0000-4000-8000-000000000002', 'Points endpoints.',      true,  1, 'seed'),
    ('1b000000-0000-4000-8000-000000000005', '16000000-0000-4000-8000-000000000002', 'Badge endpoints.',       false, 2, 'seed'),
    ('1b000000-0000-4000-8000-000000000006', '16000000-0000-4000-8000-000000000002', 'Task endpoints.',        false, 3, 'seed'),
    ('1b000000-0000-4000-8000-000000000007', '16000000-0000-4000-8000-000000000007', 'Map the legacy tables.', false, 1, 'seed')
ON CONFLICT ("ChecklistUUID") DO UPDATE SET
    "Description" = EXCLUDED."Description",
    "IsCompleted" = EXCLUDED."IsCompleted",
    "SortOrder" = EXCLUDED."SortOrder",
    "UpdatedBy" = 'seed';
