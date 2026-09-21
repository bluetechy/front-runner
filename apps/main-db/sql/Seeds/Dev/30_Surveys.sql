--
-- One survey open now and one that closed in 2025, so a "which surveys can I
-- answer" query has both a hit and a miss.
--

INSERT INTO "dbo"."Surveys" ("SurveyUUID", "OrganizationUUID", "Name", "Description", "OpensAt", "ClosesAt", "IsEnabled", "CreatedBy") VALUES
    ('23000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Quarterly Pulse',     'How is the quarter going?',        '2025-01-01 00:00:00+00', '2030-01-01 00:00:00+00', true,  'seed'),
    ('23000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Onboarding Feedback', 'Closed after the first intake.',   '2025-01-01 00:00:00+00', '2025-03-01 00:00:00+00', true,  'seed'),
    ('23000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'Lab Check-in',        'Second organization, still open.', '2025-02-01 00:00:00+00', NULL,                     true,  'seed')
ON CONFLICT ("SurveyUUID") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "OpensAt" = EXCLUDED."OpensAt",
    "ClosesAt" = EXCLUDED."ClosesAt",
    "IsEnabled" = EXCLUDED."IsEnabled",
    "UpdatedBy" = 'seed';
