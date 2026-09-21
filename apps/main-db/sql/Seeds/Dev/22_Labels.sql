--
-- Labels are per-organization, so both organizations get an "Urgent" -- the
-- pair that proves the unique key is scoped rather than global.
--

INSERT INTO "dbo"."Labels" ("LabelUUID", "OrganizationUUID", "Name", "CreatedBy") VALUES
    ('1c000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Urgent',    'seed'),
    ('1c000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Blocked',   'seed'),
    ('1c000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Chore',     'seed'),
    ('1c000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Good First Issue', 'seed'),
    ('1c000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 'Urgent',    'seed')
ON CONFLICT ("LabelUUID") DO UPDATE SET
    "OrganizationUUID" = EXCLUDED."OrganizationUUID",
    "Name" = EXCLUDED."Name",
    "UpdatedBy" = 'seed';
