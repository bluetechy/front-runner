--
-- THESE ARE TEST ADDRESSES. Every row here is fake demo data for local
-- development: the @northwind.test domain is reserved and unroutable, nothing
-- here belongs to a real person, and no mail sent to any of it leaves the
-- Mailpit container. Nothing in this file should ever reach a real
-- installation.
--
-- One row per seeded account, holding the same address dbo.Users."Email"
-- already carries for it, primary and verified. That is the state
-- dbo.ProvisionUser leaves behind after a sign-in, so seeding it means the
-- security page has something to draw before anybody has signed in twice.
--
-- Three accounts carry more than one, so the page has something worth looking
-- at:
--
--   testuser  a second verified address, so "Make primary" is offered on a
--             row that can actually take it
--   jdoe      an unverified address with a live link, which is the row the
--             Status column exists for, and a verified one that is not the
--             primary, which is the row the Primary radio exists for: it is
--             the only address on the dataset that can take the login off
--             another one, so changing a primary -- this application's copy
--             and Keycloak's credential, both at once -- can be worked
--             through by hand
--   matthewm  an unverified address whose link expired two days ago, so
--             "Send another link" has something to act on
--
-- The tokens are literals and are not secret: they reach nothing but a
-- development database, and a real one is made by main-api from
-- crypto.randomUUID. See dbo.AddUserEmail on why the database does not make
-- its own.
--
-- "VerificationSentAt" is written relative to now rather than as a literal,
-- because dbo.VerifyUserEmail measures a link's twenty-four hours from it. A
-- fixed timestamp would seed fresh and quietly become expired.
--

INSERT INTO "dbo"."UserEmails" ("UserEmailUUID", "UserUUID", "Email", "IsPrimary", "VerifiedAt", "VerificationToken", "VerificationSentAt", "CreatedBy") VALUES
    ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'support@northwind.test',         true,  CURRENT_TIMESTAMP, NULL,               NULL,                                    'seed'),
    ('b1000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'matthew.mattson@northwind.test', true,  CURRENT_TIMESTAMP, NULL,               NULL,                                    'seed'),
    ('b1000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'jane.doe@northwind.test',        true,  CURRENT_TIMESTAMP, NULL,               NULL,                                    'seed'),
    ('b1000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', 'ravi.singh@northwind.test',      true,  CURRENT_TIMESTAMP, NULL,               NULL,                                    'seed'),
    ('b1000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000005', 'li.chen@northwind.test',         true,  CURRENT_TIMESTAMP, NULL,               NULL,                                    'seed'),
    ('b1000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000006', 'maria.garcia@northwind.test',    true,  CURRENT_TIMESTAMP, NULL,               NULL,                                    'seed'),
    ('b1000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000007', 'thanh.nguyen@northwind.test',    true,  CURRENT_TIMESTAMP, NULL,               NULL,                                    'seed'),
    ('b1000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000008', 'kwame.owusu@northwind.test',     true,  CURRENT_TIMESTAMP, NULL,               NULL,                                    'seed'),
    ('b1000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000009', 'sam.johnson@northwind.test',     true,  CURRENT_TIMESTAMP, NULL,               NULL,                                    'seed'),
    ('b1000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-00000000000a', 'amina.hassan@northwind.test',    true,  CURRENT_TIMESTAMP, NULL,               NULL,                                    'seed'),
    ('b1000000-0000-4000-8000-00000000000b', 'b0000000-0000-4000-8000-00000000000b', 'piotr.kowalski@northwind.test',  true,  CURRENT_TIMESTAMP, NULL,               NULL,                                    'seed'),
    ('b1000000-0000-4000-8000-00000000000c', 'b0000000-0000-4000-8000-00000000000c', 'dana.retired@northwind.test',    true,  CURRENT_TIMESTAMP, NULL,               NULL,                                    'seed'),
    ('b1000000-0000-4000-8000-00000000000d', 'b0000000-0000-4000-8000-00000000000d', 'test.user@northwind.test',       true,  CURRENT_TIMESTAMP, NULL,               NULL,                                    'seed'),
    -- The four extra addresses, one of each state the page has to draw.
    ('b1000000-0000-4000-8000-00000000000e', 'b0000000-0000-4000-8000-00000000000d', 'test.user.two@northwind.test',   false, CURRENT_TIMESTAMP, NULL,               NULL,                                    'seed'),
    ('b1000000-0000-4000-8000-00000000000f', 'b0000000-0000-4000-8000-000000000003', 'jane.personal@northwind.test',   false, NULL,              'seed-token-fresh', CURRENT_TIMESTAMP - interval '1 hour',   'seed'),
    ('b1000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000002', 'matthew.old@northwind.test',     false, NULL,              'seed-token-stale', CURRENT_TIMESTAMP - interval '48 hours', 'seed'),
    ('b1000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000003', 'jane.work@northwind.test',       false, CURRENT_TIMESTAMP, NULL,               NULL,                                    'seed')
ON CONFLICT ("UserEmailUUID") DO UPDATE SET
    "Email" = EXCLUDED."Email",
    "IsPrimary" = EXCLUDED."IsPrimary",
    "VerifiedAt" = EXCLUDED."VerifiedAt",
    "VerificationToken" = EXCLUDED."VerificationToken",
    "VerificationSentAt" = EXCLUDED."VerificationSentAt",
    "UpdatedBy" = 'seed';
