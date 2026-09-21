--
-- Three point types. Every user tally is keyed by point type, so more than one
-- type is what makes the tally and leaderboard queries interesting.
--
-- ExpirationDuration and ResetCondition are policy that nothing enforces yet:
-- expiry is still per-row on dbo.UserPoints."ExpiresAt". See SCHEMA-NOTES.md.
--

INSERT INTO "dbo"."Points" ("PointUUID", "Name", "Description", "ExpirationDuration", "ResetCondition", "IsEnabled", "CreatedBy") VALUES
    ('e0000000-0000-4000-8000-000000000001', 'Points', 'General purpose points.',             NULL,               NULL,                          true,  'seed'),
    ('e0000000-0000-4000-8000-000000000002', 'Gems',   'Premium currency, earned sparingly.', interval '1 year',  'Anniversary of the award.',   true,  'seed'),
    ('e0000000-0000-4000-8000-000000000003', 'Kudos',  'Peer recognition, not yet launched.', interval '30 days', 'First of the calendar month.', false, 'seed')
ON CONFLICT ("PointUUID") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "ExpirationDuration" = EXCLUDED."ExpirationDuration",
    "ResetCondition" = EXCLUDED."ResetCondition",
    "IsEnabled" = EXCLUDED."IsEnabled",
    "UpdatedBy" = 'seed';
