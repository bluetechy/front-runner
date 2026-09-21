--
-- The world every test starts from. Loaded once into the scratch database by
-- bin/test.sh; each test then runs in a transaction that is rolled back, so
-- this data is identical at the start of every test.
--
-- It is deliberately small and adversarial rather than realistic — one of
-- everything that the functions branch on: an owner and a plain member, an
-- outsider who belongs to nothing, a disabled user, a disabled organization,
-- a disabled team, a disabled badge, a badge still in progress, a revoked
-- badge, and point rows that are expired, active and not-yet-expired. Demo
-- data for working with the API lives in sql/Seeds/Dev instead.
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
    ('Badge.InProgress',         '44444444-0000-4000-8000-000000000003'),
    ('Badge.Revoked',            '44444444-0000-4000-8000-000000000004'),
    ('Point.Points',             '55555555-0000-4000-8000-000000000001'),
    ('Point.Gems',               '55555555-0000-4000-8000-000000000002'),
    ('UserPoint.MemberActive',   '66666666-0000-4000-8000-000000000001'),
    ('UserPoint.MemberExpired',  '66666666-0000-4000-8000-000000000002'),
    ('UserPoint.MemberFuture',   '66666666-0000-4000-8000-000000000003'),
    ('UserPoint.MemberGems',     '66666666-0000-4000-8000-000000000004'),
    ('UserPoint.OwnerActive',    '66666666-0000-4000-8000-000000000005'),
    ('PointLevel.Bronze',        '77777777-0000-4000-8000-000000000001'),
    ('PointLevel.Silver',        '77777777-0000-4000-8000-000000000002'),
    ('PointLevel.Retired',       '77777777-0000-4000-8000-000000000003'),
    ('PointMultiplier.Active',   '88888888-0000-4000-8000-000000000001'),
    ('PointMultiplier.Lapsed',   '88888888-0000-4000-8000-000000000002'),
    ('PointRedemption.Pending',  '99999999-0000-4000-8000-000000000001'),
    ('PointRedemption.Approved', '99999999-0000-4000-8000-000000000002'),
    ('PointTransfer.Pending',    'aaaaaaaa-0000-4000-8000-000000000001'),
    ('PointTransfer.Completed',  'aaaaaaaa-0000-4000-8000-000000000002');

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
    ("test"."Fixture"('Badge.Rookie'),     'Rookie',     'First badge.',      1, true,  'fixtures'),
    ("test"."Fixture"('Badge.Retired'),    'Retired',    'Retired badge.',    4, false, 'fixtures'),
    ("test"."Fixture"('Badge.InProgress'), 'In Progress', 'Half-earned badge.', 2, true,  'fixtures'),
    ("test"."Fixture"('Badge.Revoked'),    'Revoked',    'Badge taken back.', 3, true,  'fixtures');

-- Gems carries the expiry policy columns, Points leaves them NULL, so both
-- shapes are exercised. Nothing reads them yet -- see SCHEMA-NOTES.md.
INSERT INTO "dbo"."Points" ("PointUUID", "Name", "Description", "ExpirationDuration", "ResetCondition", "CreatedBy") VALUES
    ("test"."Fixture"('Point.Points'), 'Points', 'General purpose points.', NULL,              NULL,                 'fixtures'),
    ("test"."Fixture"('Point.Gems'),   'Gems',   'Premium currency.',       interval '1 year', 'Start of the year.', 'fixtures');

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

-- Four badge rows for the member, one per state GetBadges branches on: earned
-- and visible, earned but on a disabled badge, still in progress (EarnedAt is
-- NULL), and earned then revoked. Only the Rookie row comes back from
-- GetBadges, which is what TestGetBadges_ReturnsTheBadgesAUserHolds counts.
INSERT INTO "dbo"."UserBadges" ("UserUUID", "OrganizationUUID", "BadgeUUID", "EarnedAt", "EarnedDescription", "ProgressGoal", "ProgressCurrent", "RevokedAt", "CreatedBy") VALUES
    ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Rookie'),     '2024-01-01 00:00:00+00', 'Signed up',        1,  1, NULL,                     'fixtures'),
    ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Retired'),    '2024-02-01 00:00:00+00', 'Earned long ago',  1,  1, NULL,                     'fixtures'),
    ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.InProgress'), NULL,                     NULL,              10,  4, NULL,                     'fixtures'),
    ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Revoked'),    '2024-03-01 00:00:00+00', 'Earned in error',  1,  1, '2024-04-01 00:00:00+00', 'fixtures');

-- Member's Points tally works out to 12.5000: 10 active, plus 2.5 that expire
-- in the far future, minus the 5 that expired in 2020. Gems is a second tally
-- row for the same user, and Owner has a third.
INSERT INTO "dbo"."UserPoints" ("UserPointUUID", "UserUUID", "OrganizationUUID", "PointUUID", "Description", "Reason", "Details", "Amount", "ExpiresAt", "CreatedBy") VALUES
    ("test"."Fixture"('UserPoint.MemberActive'),  "test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 'Active',      'Award',  '{"Source": "fixtures"}'::jsonb, 10.0000, NULL,                     'fixtures'),
    ("test"."Fixture"('UserPoint.MemberExpired'), "test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 'Expired',      NULL,     NULL,                            5.0000, '2020-01-01 00:00:00+00', 'fixtures'),
    ("test"."Fixture"('UserPoint.MemberFuture'),  "test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 'Not yet due',  NULL,     NULL,                            2.5000, '2999-01-01 00:00:00+00', 'fixtures'),
    ("test"."Fixture"('UserPoint.MemberGems'),    "test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Gems'),   'Gems',         NULL,     NULL,                            3.0000, NULL,                     'fixtures'),
    ("test"."Fixture"('UserPoint.OwnerActive'),   "test"."Fixture"('User.Owner'),  "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 'Active',       NULL,     NULL,                            7.0000, NULL,                     'fixtures');

-- Bronze sits below the member's Points tally of 12.5 and Silver above it, so
-- a level reader has one level reached and one not. Retired is disabled.
INSERT INTO "dbo"."PointLevels" ("PointLevelUUID", "PointUUID", "Name", "Description", "MinimumAmount", "IsEnabled", "CreatedBy") VALUES
    ("test"."Fixture"('PointLevel.Bronze'),  "test"."Fixture"('Point.Points'), 'Bronze',  'Entry level.',   10.0000, true,  'fixtures'),
    ("test"."Fixture"('PointLevel.Silver'),  "test"."Fixture"('Point.Points'), 'Silver',  'Next level up.', 50.0000, true,  'fixtures'),
    ("test"."Fixture"('PointLevel.Retired'), "test"."Fixture"('Point.Points'), 'Retired', 'Withdrawn.',    999.0000, false, 'fixtures');

-- One multiplier in its window and one that closed in 2020.
INSERT INTO "dbo"."PointMultipliers" ("PointMultiplierUUID", "Name", "Description", "Factor", "StartsAt", "EndsAt", "IsEnabled", "CreatedBy") VALUES
    ("test"."Fixture"('PointMultiplier.Active'), 'Double Points', 'Everything counts twice.', 2.0000, '2020-01-01 00:00:00+00', '2999-01-01 00:00:00+00', true, 'fixtures'),
    ("test"."Fixture"('PointMultiplier.Lapsed'), 'Launch Week',   'Long over.',               3.0000, '2019-01-01 00:00:00+00', '2020-01-01 00:00:00+00', true, 'fixtures');

-- The member has reached Bronze and not Silver.
INSERT INTO "dbo"."UserPointLevels" ("UserUUID", "OrganizationUUID", "PointLevelUUID", "ReachedAt", "CreatedBy") VALUES
    ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('PointLevel.Bronze'), '2024-01-01 00:00:00+00', 'fixtures');

-- Neither redemption has moved any points: settling one means writing a
-- negative dbo.UserPoints row, and nothing here does that.
INSERT INTO "dbo"."PointRedemptions" ("PointRedemptionUUID", "UserUUID", "OrganizationUUID", "PointUUID", "Amount", "Description", "Status", "RedeemedAt", "CreatedBy") VALUES
    ("test"."Fixture"('PointRedemption.Pending'),  "test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 2.0000, 'Coffee voucher.', 'Pending',  NULL,                     'fixtures'),
    ("test"."Fixture"('PointRedemption.Approved'), "test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 1.0000, 'Sticker pack.',   'Approved', '2024-06-01 00:00:00+00', 'fixtures');

INSERT INTO "dbo"."PointTransfers" ("PointTransferUUID", "OrganizationUUID", "PointUUID", "SenderUserUUID", "ReceiverUserUUID", "Amount", "Description", "Status", "TransferredAt", "CreatedBy") VALUES
    ("test"."Fixture"('PointTransfer.Pending'),   "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), "test"."Fixture"('User.Member'), "test"."Fixture"('User.Owner'),  1.5000, 'Thanks for the help.', 'Pending',   NULL,                     'fixtures'),
    ("test"."Fixture"('PointTransfer.Completed'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), "test"."Fixture"('User.Owner'),  "test"."Fixture"('User.Member'), 2.5000, 'Settled already.',     'Completed', '2024-05-01 00:00:00+00', 'fixtures');
