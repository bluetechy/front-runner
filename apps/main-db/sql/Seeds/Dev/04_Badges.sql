--
-- Six badges across three rarities. "Legend" is disabled, which GetBadges
-- filters out even for users who hold it.
--

INSERT INTO "dbo"."Badges" ("BadgeUUID", "Name", "Description", "Level", "Rarity", "Value", "IsPublic", "IsEnabled", "CreatedBy") VALUES
    ('d0000000-0000-4000-8000-000000000001', 'Rookie',      'Awarded on joining your first team.',        1, 'Common',    10,  true,  true,  'seed'),
    ('d0000000-0000-4000-8000-000000000002', 'Contributor', 'Ten accepted contributions.',                2, 'Uncommon',  25,  true,  true,  'seed'),
    ('d0000000-0000-4000-8000-000000000003', 'Mentor',      'Onboarded another team member.',             3, 'Rare',      50,  true,  true,  'seed'),
    ('d0000000-0000-4000-8000-000000000004', 'Shipped It',  'Shipped a release to production.',           1, 'Common',    15,  true,  true,  'seed'),
    ('d0000000-0000-4000-8000-000000000005', 'Bug Hunter',  'Reported ten reproducible defects.',         2, 'Uncommon',  30,  true,  true,  'seed'),
    ('d0000000-0000-4000-8000-000000000006', 'Legend',      'Retired badge, kept for historical record.', 5, 'Legendary', 250, false, false, 'seed')
ON CONFLICT ("BadgeUUID") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "Level" = EXCLUDED."Level",
    "Rarity" = EXCLUDED."Rarity",
    "Value" = EXCLUDED."Value",
    "IsPublic" = EXCLUDED."IsPublic",
    "IsEnabled" = EXCLUDED."IsEnabled",
    "UpdatedBy" = 'seed';
