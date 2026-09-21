--
-- Files on tasks and on comments, never both and never neither -- the table
-- carries a check that exactly one owner is set.
--

INSERT INTO "dbo"."Attachments" ("AttachmentUUID", "TaskUUID", "TaskCommentUUID", "FileName", "FilePath", "CreatedBy") VALUES
    ('2a000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', NULL,                                   'schema-draft.pdf', '/files/schema-draft.pdf', 'seed'),
    ('2a000000-0000-4000-8000-000000000002', '16000000-0000-4000-8000-000000000002', NULL,                                   'api-notes.md',     '/files/api-notes.md',     'seed'),
    ('2a000000-0000-4000-8000-000000000003', NULL,                                   '18000000-0000-4000-8000-000000000002', 'endpoints.png',    '/files/endpoints.png',    'seed'),
    ('2a000000-0000-4000-8000-000000000004', NULL,                                   '18000000-0000-4000-8000-000000000004', 'burndown.csv',     '/files/burndown.csv',     'seed')
ON CONFLICT ("AttachmentUUID") DO UPDATE SET
    "TaskUUID" = EXCLUDED."TaskUUID",
    "TaskCommentUUID" = EXCLUDED."TaskCommentUUID",
    "FileName" = EXCLUDED."FileName",
    "FilePath" = EXCLUDED."FilePath",
    "UpdatedBy" = 'seed';
