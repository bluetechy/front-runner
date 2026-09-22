--
-- THESE ARE TEST ACCOUNTS. Every row here is fake demo data for local
-- development: the names, the @northwind.test addresses and the matching
-- Keycloak passwords are all invented, none of them belongs to a real person,
-- and none of them is used anywhere outside a developer's machine. They are
-- committed so a clone comes up with something to sign in as. Nothing in this
-- file should ever reach a real installation.
--
-- Sign in with any of them at http://localhost. Passwords live in
-- Keycloak, not here, and the convention there is that THE PASSWORD IS THE
-- LOGIN NAME -- "jdoe" signs in with "jdoe". Either the login name or the
-- email works in the dialog's Email box.
--
--   testuser   test.user@northwind.test   the account the login dialog is
--                                         meant to be exercised with
--   admin      support@northwind.test     the one account GetUsers treats
--                                         as privileged
--   dretired   dana.retired@northwind.test  disabled, so the IsEnabled
--                                         filters have something to drop,
--                                         and so a refused sign-in can be
--                                         seen on purpose
--
-- Every row carries a fixed UUID and no SubjectId, so dbo.ProvisionUser
-- claims the row on that account's first sign-in rather than creating a
-- second one beside it. See apps/keycloak-idp/realm/front-runner-realm.json
-- for the matching Keycloak accounts, which have to agree with the login
-- names here for that claiming to work.
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
