--
-- Three organizations. "Legacy Holdings" is disabled so the disabled-org path
-- through the read functions has something to exclude.
--

INSERT INTO "dbo"."Organizations" ("OrganizationUUID", "Name", "IsEnabled", "CreatedBy") VALUES
    ('a0000000-0000-4000-8000-000000000001', 'Northwind Trading', true,  'seed'),
    ('a0000000-0000-4000-8000-000000000002', 'Bluetechy Labs',    true,  'seed'),
    ('a0000000-0000-4000-8000-000000000003', 'Legacy Holdings',   false, 'seed')
ON CONFLICT ("OrganizationUUID") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "IsEnabled" = EXCLUDED."IsEnabled",
    "UpdatedBy" = 'seed';
