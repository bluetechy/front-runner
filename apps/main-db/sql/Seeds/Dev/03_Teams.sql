--
-- Nine teams in Unicity International, two in Bluetechy Labs, and one disabled
-- team so GetTeams has something to filter out.
--

INSERT INTO "dbo"."Teams" ("TeamUUID", "OrganizationUUID", "Name", "IsEnabled", "CreatedBy") VALUES
    ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'API Team (US)',      true,  'seed'),
    ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Checkout Team (US)', true,  'seed'),
    ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Content Team (US)',  true,  'seed'),
    ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Flex Team (Asia)',   true,  'seed'),
    ('c0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'Growth Team (Asia)', true,  'seed'),
    ('c0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'Growth Team (US)',   true,  'seed'),
    ('c0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'Portal Team (US)',   true,  'seed'),
    ('c0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 'Shop Team (Asia)',   true,  'seed'),
    ('c0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'Shop Team (US)',     true,  'seed'),
    ('c0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002', 'Platform Team',      true,  'seed'),
    ('c0000000-0000-4000-8000-00000000000b', 'a0000000-0000-4000-8000-000000000002', 'Design Team',        true,  'seed'),
    ('c0000000-0000-4000-8000-00000000000c', 'a0000000-0000-4000-8000-000000000001', 'Sunset Team',        false, 'seed')
ON CONFLICT ("TeamUUID") DO UPDATE SET
    "OrganizationUUID" = EXCLUDED."OrganizationUUID",
    "Name" = EXCLUDED."Name",
    "IsEnabled" = EXCLUDED."IsEnabled",
    "UpdatedBy" = 'seed';
