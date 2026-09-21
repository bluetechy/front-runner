--
-- Twelve users. "admin" is the one account GetUsers recognises as privileged,
-- and "dretired" is disabled so the IsEnabled filters have something to drop.
--

INSERT INTO "dbo"."Users" ("UserUUID", "Name", "LoginName", "Email", "IsAdmin", "IsEnabled", "CreatedBy") VALUES
    ('b0000000-0000-4000-8000-000000000001', 'Admin',           'admin',     'support@unicity.com',          true,  true,  'seed'),
    ('b0000000-0000-4000-8000-000000000002', 'Matthew Mattson', 'matthewm',  'matthew.mattson@unicity.com',  false, true,  'seed'),
    ('b0000000-0000-4000-8000-000000000003', 'Jane Doe',        'jdoe',      'jane.doe@unicity.com',         false, true,  'seed'),
    ('b0000000-0000-4000-8000-000000000004', 'Ravi Singh',      'rsingh',    'ravi.singh@unicity.com',       false, true,  'seed'),
    ('b0000000-0000-4000-8000-000000000005', 'Li Chen',         'lchen',     'li.chen@unicity.com',          false, true,  'seed'),
    ('b0000000-0000-4000-8000-000000000006', 'Maria Garcia',    'mgarcia',   'maria.garcia@unicity.com',     false, true,  'seed'),
    ('b0000000-0000-4000-8000-000000000007', 'Thanh Nguyen',    'tnguyen',   'thanh.nguyen@unicity.com',     false, true,  'seed'),
    ('b0000000-0000-4000-8000-000000000008', 'Kwame Owusu',     'kowusu',    'kwame.owusu@unicity.com',      false, true,  'seed'),
    ('b0000000-0000-4000-8000-000000000009', 'Sam Johnson',     'sjohnson',  'sam.johnson@unicity.com',      false, true,  'seed'),
    ('b0000000-0000-4000-8000-00000000000a', 'Amina Hassan',    'ahassan',   'amina.hassan@unicity.com',     false, true,  'seed'),
    ('b0000000-0000-4000-8000-00000000000b', 'Piotr Kowalski',  'pkowalski', 'piotr.kowalski@unicity.com',   false, true,  'seed'),
    ('b0000000-0000-4000-8000-00000000000c', 'Dana Retired',    'dretired',  'dana.retired@unicity.com',     false, false, 'seed')
ON CONFLICT ("UserUUID") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "LoginName" = EXCLUDED."LoginName",
    "Email" = EXCLUDED."Email",
    "IsAdmin" = EXCLUDED."IsAdmin",
    "IsEnabled" = EXCLUDED."IsEnabled",
    "UpdatedBy" = 'seed';
