--
-- The world every test starts from. Loaded once into the scratch database by
-- bin/test.sh; each test then runs in a transaction that is rolled back, so
-- this data is identical at the start of every test.
--
-- It is deliberately small and adversarial rather than realistic — one of
-- everything that the functions branch on: an owner and a plain member, an
-- outsider who belongs to nothing, a disabled user, a disabled organization,
-- a disabled team, a disabled badge, and point rows that are expired, active
-- and not-yet-expired. Demo data for working with the API lives in
-- sql/Seeds/Dev instead.
--

CREATE TABLE "test"."Fixtures" (
    "Key" varchar(64) PRIMARY KEY,
    "UUID" uuid NOT NULL
);

INSERT INTO "test"."Fixtures" ("Key", "UUID") VALUES
    ('Organization.Acme',        '11111111-0000-4000-8000-000000000001'),
    ('Organization.Disabled',    '11111111-0000-4000-8000-000000000002'),
    ('User.Owner',               '22222222-0000-4000-8000-000000000001'),
    ('User.Member',              '22222222-0000-4000-8000-000000000002'),
    ('User.Outsider',            '22222222-0000-4000-8000-000000000003'),
    ('User.Admin',               '22222222-0000-4000-8000-000000000004'),
    ('User.Disabled',            '22222222-0000-4000-8000-000000000005'),
    ('Team.Core',                '33333333-0000-4000-8000-000000000001'),
    ('Team.Support',             '33333333-0000-4000-8000-000000000002'),
    ('Team.Archived',            '33333333-0000-4000-8000-000000000003'),
    ('Badge.Rookie',             '44444444-0000-4000-8000-000000000001'),
    ('Badge.Retired',            '44444444-0000-4000-8000-000000000002'),
    ('Point.Points',             '55555555-0000-4000-8000-000000000001'),
    ('Point.Gems',               '55555555-0000-4000-8000-000000000002'),
    ('UserPoint.MemberActive',   '66666666-0000-4000-8000-000000000001'),
    ('UserPoint.MemberExpired',  '66666666-0000-4000-8000-000000000002'),
    ('UserPoint.MemberFuture',   '66666666-0000-4000-8000-000000000003'),
    ('UserPoint.MemberGems',     '66666666-0000-4000-8000-000000000004'),
    ('UserPoint.OwnerActive',    '66666666-0000-4000-8000-000000000005');

INSERT INTO "dbo"."Organizations" ("OrganizationUUID", "Name", "IsEnabled", "CreatedBy") VALUES
    ("test"."Fixture"('Organization.Acme'),     'Acme',             true,  'fixtures'),
    ("test"."Fixture"('Organization.Disabled'), 'Disabled Company', false, 'fixtures');

INSERT INTO "dbo"."Users" ("UserUUID", "Name", "LoginName", "Email", "IsAdmin", "IsEnabled", "CreatedBy") VALUES
    ("test"."Fixture"('User.Owner'),    'Olivia Owner',    'owner',    'owner@example.test',    false, true,  'fixtures'),
    ("test"."Fixture"('User.Member'),   'Marcus Member',   'member',   'member@example.test',   false, true,  'fixtures'),
    ("test"."Fixture"('User.Outsider'), 'Oscar Outsider',  'outsider', 'outsider@example.test', false, true,  'fixtures'),
    ("test"."Fixture"('User.Admin'),    'Ada Admin',       'admin',    'admin@example.test',    true,  true,  'fixtures'),
    ("test"."Fixture"('User.Disabled'), 'Dana Disabled',   'disabled', 'disabled@example.test', false, false, 'fixtures');

INSERT INTO "dbo"."Teams" ("TeamUUID", "OrganizationUUID", "Name", "IsEnabled", "CreatedBy") VALUES
    ("test"."Fixture"('Team.Core'),     "test"."Fixture"('Organization.Acme'), 'Core Team',     true,  'fixtures'),
    ("test"."Fixture"('Team.Support'),  "test"."Fixture"('Organization.Acme'), 'Support Team',  true,  'fixtures'),
    ("test"."Fixture"('Team.Archived'), "test"."Fixture"('Organization.Acme'), 'Archived Team', false, 'fixtures');

INSERT INTO "dbo"."Badges" ("BadgeUUID", "Name", "Description", "Level", "IsEnabled", "CreatedBy") VALUES
    ("test"."Fixture"('Badge.Rookie'),  'Rookie',  'First badge.',   1, true,  'fixtures'),
    ("test"."Fixture"('Badge.Retired'), 'Retired', 'Retired badge.', 4, false, 'fixtures');

INSERT INTO "dbo"."Points" ("PointUUID", "Name", "Description", "CreatedBy") VALUES
    ("test"."Fixture"('Point.Points'), 'Points', 'General purpose points.', 'fixtures'),
    ("test"."Fixture"('Point.Gems'),   'Gems',   'Premium currency.',       'fixtures');

-- Owner owns Acme; Member and Disabled belong to it; Outsider belongs to
-- nothing. Owner also owns the disabled organization, so ownership alone is
-- not enough to pass IsOwnerOfOrganization.
INSERT INTO "dbo"."UserOrganizations" ("UserUUID", "OrganizationUUID", "IsOwner", "CreatedBy") VALUES
    ("test"."Fixture"('User.Owner'),    "test"."Fixture"('Organization.Acme'),     true,  'fixtures'),
    ("test"."Fixture"('User.Member'),   "test"."Fixture"('Organization.Acme'),     false, 'fixtures'),
    ("test"."Fixture"('User.Disabled'), "test"."Fixture"('Organization.Acme'),     false, 'fixtures'),
    ("test"."Fixture"('User.Owner'),    "test"."Fixture"('Organization.Disabled'), true,  'fixtures');

-- Member manages Core; Owner is only a member of it. Member is also on the
-- archived team, which the team reads must not return.
INSERT INTO "dbo"."UserTeams" ("UserUUID", "TeamUUID", "IsManager", "CreatedBy") VALUES
    ("test"."Fixture"('User.Member'), "test"."Fixture"('Team.Core'),     true,  'fixtures'),
    ("test"."Fixture"('User.Owner'),  "test"."Fixture"('Team.Core'),     false, 'fixtures'),
    ("test"."Fixture"('User.Member'), "test"."Fixture"('Team.Support'),  false, 'fixtures'),
    ("test"."Fixture"('User.Member'), "test"."Fixture"('Team.Archived'), false, 'fixtures');

INSERT INTO "dbo"."UserBadges" ("UserUUID", "OrganizationUUID", "BadgeUUID", "CreatedBy") VALUES
    ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Rookie'),  'fixtures'),
    ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Retired'), 'fixtures');

-- Member's Points tally works out to 12.5000: 10 active, plus 2.5 that expire
-- in the far future, minus the 5 that expired in 2020. Gems is a second tally
-- row for the same user, and Owner has a third.
INSERT INTO "dbo"."UserPoints" ("UserPointUUID", "UserUUID", "OrganizationUUID", "PointUUID", "Description", "Amount", "ExpiresAt", "CreatedBy") VALUES
    ("test"."Fixture"('UserPoint.MemberActive'),  "test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 'Active',      10.0000, NULL,                     'fixtures'),
    ("test"."Fixture"('UserPoint.MemberExpired'), "test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 'Expired',      5.0000, '2020-01-01 00:00:00+00', 'fixtures'),
    ("test"."Fixture"('UserPoint.MemberFuture'),  "test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 'Not yet due',  2.5000, '2999-01-01 00:00:00+00', 'fixtures'),
    ("test"."Fixture"('UserPoint.MemberGems'),    "test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Gems'),   'Gems',         3.0000, NULL,                     'fixtures'),
    ("test"."Fixture"('UserPoint.OwnerActive'),   "test"."Fixture"('User.Owner'),  "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 'Active',       7.0000, NULL,                     'fixtures');
