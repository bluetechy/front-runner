--
-- Tasks across the four roadmaps, plus two with no roadmap at all -- those are
-- the rows that show why dbo.Tasks carries OrganizationUUID itself instead of
-- reaching it through dbo.Roadmaps.
--
-- Between them they cover every Status, an overdue task, a task with no due
-- date, and an unassigned task, so a reader has more than one answer for each
-- filter the draft functions applied.
--
-- "Import legacy rows" is the row to be careful with: it is Cancelled and past
-- its due date, so an overdue query written as "Status <> 'Completed'" reports
-- it as late. Both terminal states have to be excluded -- see the tests in
-- sql/Tests/Cases/Tasks.sql.
--

INSERT INTO "dbo"."Tasks" ("TaskUUID", "OrganizationUUID", "RoadmapUUID", "Name", "Description", "Category", "Priority", "Status", "SortOrder", "DueDate", "AssignedUserUUID", "CreatedBy") VALUES
    ('16000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000001', 'Design the schema',   'Tables, keys and triggers.',        'Design', 3, 'Completed',  1, '2025-04-01', 'b0000000-0000-4000-8000-000000000002', 'seed'),
    ('16000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000001', 'Build the API',       'Endpoints over the read functions.', 'Build',  3, 'InProgress', 2, '2030-01-01', 'b0000000-0000-4000-8000-000000000003', 'seed'),
    ('16000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000001', 'Build the GUI',       'Screens for badges and points.',     'Build',  2, 'Pending',    3, '2030-02-01', 'b0000000-0000-4000-8000-000000000004', 'seed'),
    ('16000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000001', 'Ship the release',    'Overdue and still open.',            'Build',  1, 'Pending',    4, '2025-06-01', 'b0000000-0000-4000-8000-000000000002', 'seed'),
    ('16000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000002', 'Write the welcome', 'Copy for the first-run screen.',      'Admin',  1, 'Pending',    1, NULL,         'b0000000-0000-4000-8000-000000000006', 'seed'),
    ('16000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000002', 'Seed demo orgs',      'Unassigned, waiting for an owner.',  'Admin',  0, 'Pending',    2, '2030-03-01', NULL,                                   'seed'),
    ('16000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000003', 'Import legacy rows',  'Cancelled with the roadmap.',        'Build',  0, 'Cancelled',  1, '2025-03-01', 'b0000000-0000-4000-8000-000000000003', 'seed'),
    ('16000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', NULL,                                   'Renew the domain',    'No roadmap -- a standing chore.',    'Admin',  2, 'Pending',    0, '2030-09-01', 'b0000000-0000-4000-8000-000000000002', 'seed'),
    ('16000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', NULL,                                   'Review access list',  'No roadmap, overdue, unassigned.',   'Admin',  1, 'Pending',    0, '2025-02-01', NULL,                                   'seed'),
    ('16000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002', '15000000-0000-4000-8000-000000000004', 'Invite the team',     'First task in the second org.',      'Admin',  2, 'InProgress', 1, '2030-01-15', 'b0000000-0000-4000-8000-000000000005', 'seed')
ON CONFLICT ("TaskUUID") DO UPDATE SET
    "OrganizationUUID" = EXCLUDED."OrganizationUUID",
    "RoadmapUUID" = EXCLUDED."RoadmapUUID",
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "Category" = EXCLUDED."Category",
    "Priority" = EXCLUDED."Priority",
    "Status" = EXCLUDED."Status",
    "SortOrder" = EXCLUDED."SortOrder",
    "DueDate" = EXCLUDED."DueDate",
    "AssignedUserUUID" = EXCLUDED."AssignedUserUUID",
    "UpdatedBy" = 'seed';
