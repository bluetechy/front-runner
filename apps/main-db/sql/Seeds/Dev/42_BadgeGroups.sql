--
-- Two collections. dbo.GetBadgeGroups reports how far a user is through each.
--

INSERT INTO "dbo"."BadgeGroups" ("BadgeGroupUUID", "Name", "Description", "CreatedBy") VALUES
    ('2e000000-0000-4000-8000-000000000001', 'Getting Started', 'The badges a new member picks up first.', 'seed'),
    ('2e000000-0000-4000-8000-000000000002', 'Craft',           'Badges for sustained contribution.',      'seed')
ON CONFLICT ("BadgeGroupUUID") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "UpdatedBy" = 'seed';
