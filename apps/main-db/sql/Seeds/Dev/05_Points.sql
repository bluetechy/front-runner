--
-- Three point types. Every user tally is keyed by point type, so more than one
-- type is what makes the tally and leaderboard queries interesting.
--

INSERT INTO "dbo"."Points" ("PointUUID", "Name", "Description", "IsEnabled", "CreatedBy") VALUES
    ('e0000000-0000-4000-8000-000000000001', 'Points', 'General purpose points.',            true,  'seed'),
    ('e0000000-0000-4000-8000-000000000002', 'Gems',   'Premium currency, earned sparingly.', true,  'seed'),
    ('e0000000-0000-4000-8000-000000000003', 'Kudos',  'Peer recognition, not yet launched.', false, 'seed')
ON CONFLICT ("PointUUID") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "IsEnabled" = EXCLUDED."IsEnabled",
    "UpdatedBy" = 'seed';
