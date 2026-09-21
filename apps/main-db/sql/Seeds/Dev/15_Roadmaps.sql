--
-- Two live roadmaps and one shut down, so the IsEnabled filter has something
-- to exclude. 16_Tasks.sql hangs off these.
--

INSERT INTO "dbo"."Roadmaps" ("RoadmapUUID", "OrganizationUUID", "Name", "Description", "IsEnabled", "CreatedBy") VALUES
    ('15000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Platform Q3',   'Schema, API and GUI work for the quarter.', true,  'seed'),
    ('15000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Onboarding',    'Getting new members set up faster.',        true,  'seed'),
    ('15000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Legacy Import', 'Abandoned in favour of the new schema.',    false, 'seed'),
    ('15000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002', 'Lab Bootstrap', 'Standing the second organization up.',      true,  'seed')
ON CONFLICT ("RoadmapUUID") DO UPDATE SET
    "OrganizationUUID" = EXCLUDED."OrganizationUUID",
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "IsEnabled" = EXCLUDED."IsEnabled",
    "UpdatedBy" = 'seed';
