--
-- Every question type: a single choice, a multiple choice and free text. A
-- 'Text' question has no rows in 32_SurveyQuestionOptions.sql.
--

INSERT INTO "dbo"."SurveyQuestions" ("SurveyQuestionUUID", "SurveyUUID", "QuestionText", "QuestionType", "SortOrder", "IsRequired", "CreatedBy") VALUES
    ('24000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'How is the quarter going?',        'Choice',      1, true,  'seed'),
    ('24000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000001', 'Which areas need attention?',      'MultiChoice', 2, false, 'seed'),
    ('24000000-0000-4000-8000-000000000003', '23000000-0000-4000-8000-000000000001', 'Anything else?',                   'Text',        3, false, 'seed'),
    ('24000000-0000-4000-8000-000000000004', '23000000-0000-4000-8000-000000000002', 'Was onboarding clear?',            'Choice',      1, true,  'seed'),
    ('24000000-0000-4000-8000-000000000005', '23000000-0000-4000-8000-000000000003', 'Is the lab set up to your liking?', 'Choice',     1, true,  'seed')
ON CONFLICT ("SurveyQuestionUUID") DO UPDATE SET
    "QuestionText" = EXCLUDED."QuestionText",
    "QuestionType" = EXCLUDED."QuestionType",
    "SortOrder" = EXCLUDED."SortOrder",
    "IsRequired" = EXCLUDED."IsRequired",
    "UpdatedBy" = 'seed';
