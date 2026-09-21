--
-- One multiplier open now and one that closed in 2024, so a "which multiplier
-- applies" query has both a hit and a miss. Nothing applies them: the amount
-- on a dbo.UserPoints row is what dbo.calculate_tallies sums, so whatever
-- awards the points has to do the multiplying first.
--

INSERT INTO "dbo"."PointMultipliers" ("PointMultiplierUUID", "Name", "Description", "Factor", "StartsAt", "EndsAt", "IsEnabled", "CreatedBy") VALUES
    ('11000000-0000-4000-8000-000000000001', 'Double Points', 'Every award counts twice.', 2.0000, '2025-01-01 00:00:00+00', '2030-01-01 00:00:00+00', true,  'seed'),
    ('11000000-0000-4000-8000-000000000002', 'Launch Week',   'Closed campaign.',          3.0000, '2024-01-01 00:00:00+00', '2024-01-08 00:00:00+00', true,  'seed'),
    ('11000000-0000-4000-8000-000000000003', 'Staff Bonus',   'Drafted, never switched on.', 1.5000, NULL,                  NULL,                     false, 'seed')
ON CONFLICT ("PointMultiplierUUID") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "Factor" = EXCLUDED."Factor",
    "StartsAt" = EXCLUDED."StartsAt",
    "EndsAt" = EXCLUDED."EndsAt",
    "IsEnabled" = EXCLUDED."IsEnabled",
    "UpdatedBy" = 'seed';
