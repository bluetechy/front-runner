--
-- The choices on offer. These are the rows the draft's jsonb blob made
-- pointless: with every answer opaque, nothing ever referenced an option.
--

INSERT INTO "dbo"."SurveyQuestionOptions" ("SurveyQuestionOptionUUID", "SurveyQuestionUUID", "OptionText", "SortOrder", "CreatedBy") VALUES
    ('25000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', 'Well',            1, 'seed'),
    ('25000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000001', 'About right',     2, 'seed'),
    ('25000000-0000-4000-8000-000000000003', '24000000-0000-4000-8000-000000000001', 'Badly',           3, 'seed'),
    ('25000000-0000-4000-8000-000000000004', '24000000-0000-4000-8000-000000000002', 'Tooling',         1, 'seed'),
    ('25000000-0000-4000-8000-000000000005', '24000000-0000-4000-8000-000000000002', 'Documentation',   2, 'seed'),
    ('25000000-0000-4000-8000-000000000006', '24000000-0000-4000-8000-000000000002', 'Meetings',        3, 'seed'),
    ('25000000-0000-4000-8000-000000000007', '24000000-0000-4000-8000-000000000004', 'Yes',             1, 'seed'),
    ('25000000-0000-4000-8000-000000000008', '24000000-0000-4000-8000-000000000004', 'No',              2, 'seed'),
    ('25000000-0000-4000-8000-000000000009', '24000000-0000-4000-8000-000000000005', 'Yes',             1, 'seed'),
    ('25000000-0000-4000-8000-00000000000a', '24000000-0000-4000-8000-000000000005', 'Not yet',         2, 'seed')
ON CONFLICT ("SurveyQuestionOptionUUID") DO UPDATE SET
    "OptionText" = EXCLUDED."OptionText",
    "SortOrder" = EXCLUDED."SortOrder",
    "UpdatedBy" = 'seed';
