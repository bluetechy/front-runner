--
-- Thirteen users. "admin" is the one account GetUsers recognises as privileged,
-- and "dretired" is disabled so the IsEnabled filters have something to drop.
-- "testuser" is the account the login dialog is exercised with; it carries no
-- SubjectId, so dbo.ProvisionUser claims this row on its first sign-in
-- instead of making a second one beside it.
--

INSERT INTO "dbo"."Users" ("UserUUID", "Name", "LoginName", "Email", "IsAdmin", "IsEnabled", "CreatedBy") VALUES
    ('b0000000-0000-4000-8000-000000000001', 'Admin',           'admin',     'support@northwind.test',         true,  true,  'seed'),
    ('b0000000-0000-4000-8000-000000000002', 'Matthew Mattson', 'matthewm',  'matthew.mattson@northwind.test', false, true,  'seed'),
    ('b0000000-0000-4000-8000-000000000003', 'Jane Doe',        'jdoe',      'jane.doe@northwind.test',        false, true,  'seed'),
    ('b0000000-0000-4000-8000-000000000004', 'Ravi Singh',      'rsingh',    'ravi.singh@northwind.test',      false, true,  'seed'),
    ('b0000000-0000-4000-8000-000000000005', 'Li Chen',         'lchen',     'li.chen@northwind.test',         false, true,  'seed'),
    ('b0000000-0000-4000-8000-000000000006', 'Maria Garcia',    'mgarcia',   'maria.garcia@northwind.test',    false, true,  'seed'),
    ('b0000000-0000-4000-8000-000000000007', 'Thanh Nguyen',    'tnguyen',   'thanh.nguyen@northwind.test',    false, true,  'seed'),
    ('b0000000-0000-4000-8000-000000000008', 'Kwame Owusu',     'kowusu',    'kwame.owusu@northwind.test',     false, true,  'seed'),
    ('b0000000-0000-4000-8000-000000000009', 'Sam Johnson',     'sjohnson',  'sam.johnson@northwind.test',     false, true,  'seed'),
    ('b0000000-0000-4000-8000-00000000000a', 'Amina Hassan',    'ahassan',   'amina.hassan@northwind.test',    false, true,  'seed'),
    ('b0000000-0000-4000-8000-00000000000b', 'Piotr Kowalski',  'pkowalski', 'piotr.kowalski@northwind.test',  false, true,  'seed'),
    ('b0000000-0000-4000-8000-00000000000c', 'Dana Retired',    'dretired',  'dana.retired@northwind.test',    false, false, 'seed'),
    ('b0000000-0000-4000-8000-00000000000d', 'Test User',       'testuser',  'test.user@northwind.test',       false, true,  'seed')
ON CONFLICT ("UserUUID") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "LoginName" = EXCLUDED."LoginName",
    "Email" = EXCLUDED."Email",
    "IsAdmin" = EXCLUDED."IsAdmin",
    "IsEnabled" = EXCLUDED."IsEnabled",
    "UpdatedBy" = 'seed';
