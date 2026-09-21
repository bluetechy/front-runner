--
-- Per-task grants. Advisory: no live function consults this table, so a grant
-- here gives nobody access to anything. The last row is the one that makes
-- that visible -- pkowalski belongs to no organization and holds a Read grant
-- regardless.
--

INSERT INTO "dbo"."AccessControlLists" ("AccessControlListUUID", "UserUUID", "TaskUUID", "PermissionType", "CreatedBy") VALUES
    ('29000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', '16000000-0000-4000-8000-000000000002', 'Admin', 'seed'),
    ('29000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', '16000000-0000-4000-8000-000000000002', 'Write', 'seed'),
    ('29000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000004', '16000000-0000-4000-8000-000000000002', 'Read',  'seed'),
    ('29000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', '16000000-0000-4000-8000-000000000004', 'Admin', 'seed'),
    ('29000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-00000000000b', '16000000-0000-4000-8000-000000000002', 'Read',  'seed')
ON CONFLICT ("AccessControlListUUID") DO UPDATE SET
    "PermissionType" = EXCLUDED."PermissionType",
    "UpdatedBy" = 'seed';
