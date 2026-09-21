--
-- One log serving both readers. IsUserVisible true means the row belongs in a
-- user's activity feed; false means it is audit only. The drafts had this as
-- two tables, ActivityFeed and EventLog, with the same shape and no rule for
-- which one anything wrote to -- see SCHEMA-NOTES.md.
--
-- The last two rows carry no user and no organization, which is why both
-- columns are nullable.
--

INSERT INTO "dbo"."EventLog" ("EventLogUUID", "OrganizationUUID", "UserUUID", "EventType", "Description", "IsUserVisible", "OccurredAt", "CreatedBy") VALUES
    ('2c000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'TaskCompleted',  'Matthew finished Design the schema.', true,  '2025-03-28 17:30:00+00', 'seed'),
    ('2c000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'TaskAssigned',   'Jane picked up Build the API.',       true,  '2025-04-04 08:00:00+00', 'seed'),
    ('2c000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'PointsEarned',   'Matthew earned a quarterly bonus.',   true,  '2025-02-11 09:00:00+00', 'seed'),
    ('2c000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004', 'RedemptionRejected', 'Ravi''s redemption was refused.',  true,  '2025-05-03 09:05:00+00', 'seed'),
    ('2c000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000005', 'SurveyCompleted', 'Li answered the lab check-in.',      true,  '2025-02-06 10:00:00+00', 'seed'),
    ('2c000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', NULL,                                   'TalliesRebuilt',  'Nightly tally recalculation.',       false, '2025-06-01 02:00:00+00', 'seed'),
    ('2c000000-0000-4000-8000-000000000007', NULL,                                   NULL,                                   'SchemaApplied',   'Schema rebuilt from sql/.',          false, '2025-06-01 01:00:00+00', 'seed')
ON CONFLICT ("EventLogUUID") DO UPDATE SET
    "OrganizationUUID" = EXCLUDED."OrganizationUUID",
    "UserUUID" = EXCLUDED."UserUUID",
    "EventType" = EXCLUDED."EventType",
    "Description" = EXCLUDED."Description",
    "IsUserVisible" = EXCLUDED."IsUserVisible",
    "OccurredAt" = EXCLUDED."OccurredAt",
    "UpdatedBy" = 'seed';
