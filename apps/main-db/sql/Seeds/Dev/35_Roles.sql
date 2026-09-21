--
-- Named roles per organization. Nothing reads them: the live functions
-- authorise on organization and team membership and on the boolean flags
-- (Users."IsAdmin", UserOrganizations."IsOwner", UserTeams."IsManager"). See
-- SCHEMA-NOTES.md on the schema carrying several unconnected authorization
-- mechanisms.
--
-- Both organizations get a "Lead", which is the pair that shows the unique key
-- is scoped rather than global.
--

INSERT INTO "dbo"."Roles" ("RoleUUID", "OrganizationUUID", "Name", "Description", "IsEnabled", "CreatedBy") VALUES
    ('28000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Lead',        'Runs a team.',                  true,  'seed'),
    ('28000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Reviewer',    'Signs off other people''s work.', true,  'seed'),
    ('28000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Contributor', 'Does the work.',                true,  'seed'),
    ('28000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Auditor',     'Retired role.',                 false, 'seed'),
    ('28000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 'Lead',        'Same name, second organization.', true, 'seed')
ON CONFLICT ("RoleUUID") DO UPDATE SET
    "OrganizationUUID" = EXCLUDED."OrganizationUUID",
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "IsEnabled" = EXCLUDED."IsEnabled",
    "UpdatedBy" = 'seed';
