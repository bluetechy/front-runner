--
-- Discussion on the two tasks that are actually moving.
--

INSERT INTO "dbo"."TaskComments" ("TaskCommentUUID", "TaskUUID", "UserUUID", "Comment", "CreatedBy") VALUES
    ('18000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Schema is in, triggers included.',        'seed'),
    ('18000000-0000-4000-8000-000000000002', '16000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'Points endpoints done, badges next.',     'seed'),
    ('18000000-0000-4000-8000-000000000003', '16000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'Shout if the read functions need work.',  'seed'),
    ('18000000-0000-4000-8000-000000000004', '16000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', 'Slipping -- waiting on the API.',         'seed')
ON CONFLICT ("TaskCommentUUID") DO UPDATE SET
    "Comment" = EXCLUDED."Comment",
    "UpdatedBy" = 'seed';
