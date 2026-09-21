--
-- What the labels are actually on. dbo.TaskLabels is not from the drafts --
-- Drafts/Tables/Labels.sql defined labels and nothing that wears one. See
-- SCHEMA-NOTES.md.
--
-- A join table with no key of its own, so the conflict target is the pair.
--

INSERT INTO "dbo"."TaskLabels" ("TaskUUID", "LabelUUID", "CreatedBy") VALUES
    ('16000000-0000-4000-8000-000000000002', '1c000000-0000-4000-8000-000000000001', 'seed'),
    ('16000000-0000-4000-8000-000000000004', '1c000000-0000-4000-8000-000000000001', 'seed'),
    ('16000000-0000-4000-8000-000000000004', '1c000000-0000-4000-8000-000000000002', 'seed'),
    ('16000000-0000-4000-8000-000000000005', '1c000000-0000-4000-8000-000000000004', 'seed'),
    ('16000000-0000-4000-8000-000000000008', '1c000000-0000-4000-8000-000000000003', 'seed'),
    ('16000000-0000-4000-8000-000000000009', '1c000000-0000-4000-8000-000000000003', 'seed'),
    ('16000000-0000-4000-8000-00000000000a', '1c000000-0000-4000-8000-000000000005', 'seed')
ON CONFLICT ("TaskUUID", "LabelUUID") DO UPDATE SET
    "UpdatedBy" = 'seed';
