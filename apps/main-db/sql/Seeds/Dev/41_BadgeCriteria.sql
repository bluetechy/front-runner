--
-- What each badge takes. dbo.GetBadgeProgress reports only badges that have a
-- criteria row -- there is nothing to measure the others against -- so "Shipped
-- It" is deliberately left without one.
--

INSERT INTO "dbo"."BadgeCriteria" ("BadgeCriteriaUUID", "BadgeUUID", "Description", "BadgeType", "Value", "CreatedBy") VALUES
    ('2d000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Join a team.',                  'Activity',    1,  'seed'),
    ('2d000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'Ten accepted contributions.',   'Achievement', 10, 'seed'),
    ('2d000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', 'Onboard a team member.',        'Activity',    1,  'seed'),
    ('2d000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000005', 'Ten reproducible defects.',     'Achievement', 10, 'seed'),
    ('2d000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000006', 'Fifty accepted contributions.', 'Achievement', 50, 'seed')
ON CONFLICT ("BadgeCriteriaUUID") DO UPDATE SET
    "BadgeUUID" = EXCLUDED."BadgeUUID",
    "Description" = EXCLUDED."Description",
    "BadgeType" = EXCLUDED."BadgeType",
    "Value" = EXCLUDED."Value",
    "UpdatedBy" = 'seed';
