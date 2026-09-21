--
-- Tiers for the two live point types. The thresholds are set against the
-- balances 09_UserPoints.sql produces -- most users land on Bronze, a couple
-- reach Silver, and only jdoe reaches Gold -- so a leaderboard or level reader
-- has something with more than one answer in it. "Legend" is disabled.
--

INSERT INTO "dbo"."PointLevels" ("PointLevelUUID", "PointUUID", "Name", "Description", "MinimumAmount", "IsEnabled", "CreatedBy") VALUES
    ('10000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'Bronze', 'Getting started.',              50.0000, true,  'seed'),
    ('10000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'Silver', 'A full year of contribution.', 100.0000, true,  'seed'),
    ('10000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000001', 'Gold',   'Top of the table.',           150.0000, true,  'seed'),
    ('10000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000001', 'Legend', 'Retired tier.',               500.0000, false, 'seed'),
    ('10000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000002', 'Collector', 'Ten gems.',                 10.0000, true,  'seed')
ON CONFLICT ("PointLevelUUID") DO UPDATE SET
    "PointUUID" = EXCLUDED."PointUUID",
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "MinimumAmount" = EXCLUDED."MinimumAmount",
    "IsEnabled" = EXCLUDED."IsEnabled",
    "UpdatedBy" = 'seed';
