--
-- THIS IS TEST DATA. Fake demo rows for local development. Nothing here
-- belongs to a real person, no device or place named here was ever used by
-- anybody, and nothing in this file should ever reach a real installation.
--
-- The security page's RECENT ACTIVITY section, given something to draw. The
-- application does not write a login event yet -- logins are Keycloak's, and
-- what main-api records today is what it does itself: an address added,
-- removed or made the login. So the logins below are seeded rather than
-- earned, which is also why they are the rows worth having: they are the ones
-- carrying a device and a place, and the ones the dialog's question is really
-- about.
--
-- jdoe is the account the security page is demonstrated on, the way she is for
-- the address list in 46_UserEmails.sql and the privacy switch in
-- 47_UserProfiles.sql. She carries one of everything the page branches on: an
-- unanswered event with a device and a place, an unanswered one with neither,
-- two already answered, and a login from somewhere she has never been, which
-- is the row somebody demonstrating "No, secure account" should press.
--
-- The times are relative to when the dataset is seeded rather than fixed
-- dates, because this is the one seeded list whose whole subject is being
-- recent: a page headed RECENT ACTIVITY showing nothing from the last eighteen
-- months is demonstrating the wrong thing. Re-seeding moves them forward,
-- which is the point.
--

INSERT INTO "dbo"."SecurityEvents" ("SecurityEventUUID", "UserUUID", "EventType", "Description", "Device", "Location", "OccurredAt", "ReviewedAt", "Recognized", "CreatedBy") VALUES
    ('2d000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'LoginSucceeded',      'New login on Mac OS.',                                 'Mac OS',  'Utah, USA',         CURRENT_TIMESTAMP - interval '2 hours', NULL,                                    NULL, 'seed'),
    ('2d000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'EmailAdded',          'jane.doe.work@northwind.test was added.',              NULL,      NULL,                CURRENT_TIMESTAMP - interval '3 days',  NULL,                                    NULL, 'seed'),
    ('2d000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'PrimaryEmailChanged', 'You login with jane.doe@northwind.test from now on.',  NULL,      NULL,                CURRENT_TIMESTAMP - interval '9 days',  CURRENT_TIMESTAMP - interval '9 days',   true, 'seed'),
    ('2d000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000003', 'LoginSucceeded',      'New login on Windows.',                                'Windows', 'Jalisco, Mexico',   CURRENT_TIMESTAMP - interval '26 days', NULL,                                    NULL, 'seed'),
    ('2d000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000003', 'PasswordChanged',     'Your password was changed.',                           NULL,      NULL,                CURRENT_TIMESTAMP - interval '40 days', CURRENT_TIMESTAMP - interval '39 days',  true, 'seed'),
    ('2d000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000002', 'LoginSucceeded',      'New login on Mac OS.',                                 'Mac OS',  'Utah, USA',         CURRENT_TIMESTAMP - interval '5 hours', NULL,                                    NULL, 'seed'),
    ('2d000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000002', 'EmailRemoved',        'matthew.mattson.old@northwind.test was removed.',      NULL,      NULL,                CURRENT_TIMESTAMP - interval '6 days',  CURRENT_TIMESTAMP - interval '6 days',   true, 'seed')
ON CONFLICT ("SecurityEventUUID") DO UPDATE SET
    "UserUUID" = EXCLUDED."UserUUID",
    "EventType" = EXCLUDED."EventType",
    "Description" = EXCLUDED."Description",
    "Device" = EXCLUDED."Device",
    "Location" = EXCLUDED."Location",
    "OccurredAt" = EXCLUDED."OccurredAt",
    "ReviewedAt" = EXCLUDED."ReviewedAt",
    "Recognized" = EXCLUDED."Recognized",
    "UpdatedBy" = 'seed';
