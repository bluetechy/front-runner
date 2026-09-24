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
    ('Badge.Rare',               '44444444-0000-4000-8000-000000000005'),
    ('Badge.Expiring',           '44444444-0000-4000-8000-000000000006'),
    ('BadgeGroup.Starter',       '44444444-0000-4000-8000-000000000007'),
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
    ('PointTransfer.Completed',  'aaaaaaaa-0000-4000-8000-000000000002'),
    ('Roadmap.Launch',           'bbbbbbbb-0000-4000-8000-000000000001'),
    ('Roadmap.Archived',         'bbbbbbbb-0000-4000-8000-000000000002'),
    ('Task.Design',              'cccccccc-0000-4000-8000-000000000001'),
    ('Task.Build',               'cccccccc-0000-4000-8000-000000000002'),
    ('Task.Overdue',             'cccccccc-0000-4000-8000-000000000003'),
    ('Task.Done',                'cccccccc-0000-4000-8000-000000000004'),
    ('Task.Loose',               'cccccccc-0000-4000-8000-000000000005'),
    ('Task.Cancelled',           'cccccccc-0000-4000-8000-000000000006'),
    ('Label.Urgent',             'dddddddd-0000-4000-8000-000000000001'),
    ('Label.Chore',              'dddddddd-0000-4000-8000-000000000002'),
    ('Workflow.Redemption',      'eeeeeeee-0000-4000-8000-000000000001'),
    ('Stage.Manager',            'eeeeeeee-0000-4000-8000-000000000002'),
    ('Stage.Finance',            'eeeeeeee-0000-4000-8000-000000000003'),
    ('Request.AtFinance',        'eeeeeeee-0000-4000-8000-000000000004'),
    ('Request.Finished',         'eeeeeeee-0000-4000-8000-000000000005'),
    ('Survey.Pulse',             'ffffffff-0000-4000-8000-000000000001'),
    ('Question.Choice',          'ffffffff-0000-4000-8000-000000000002'),
    ('Question.Text',            'ffffffff-0000-4000-8000-000000000003'),
    ('Option.Yes',               'ffffffff-0000-4000-8000-000000000004'),
    ('Option.No',                'ffffffff-0000-4000-8000-000000000005'),
    ('Participant.Member',       'ffffffff-0000-4000-8000-000000000006'),
    ('Participant.Owner',        'ffffffff-0000-4000-8000-000000000007'),
    ('Role.Lead',                '12121212-0000-4000-8000-000000000001'),
    ('Role.Reviewer',            '12121212-0000-4000-8000-000000000002'),
    ('Notification.Unread',      '13131313-0000-4000-8000-000000000001'),
    ('Notification.Read',        '13131313-0000-4000-8000-000000000002'),
    ('Invitation.Pending',       '14141414-0000-4000-8000-000000000001'),
    ('Invitation.OwnerSeat',     '14141414-0000-4000-8000-000000000002'),
    ('Invitation.Expired',       '14141414-0000-4000-8000-000000000003'),
    ('Invitation.Declined',      '14141414-0000-4000-8000-000000000004'),
    ('Invitation.DisabledOrg',   '14141414-0000-4000-8000-000000000005'),
    ('UserEmail.OwnerPrimary',   '15151515-0000-4000-8000-000000000001'),
    ('UserEmail.MemberPrimary',  '15151515-0000-4000-8000-000000000002'),
    ('UserEmail.MemberWork',     '15151515-0000-4000-8000-000000000003'),
    ('UserEmail.MemberFresh',    '15151515-0000-4000-8000-000000000004'),
    ('UserEmail.MemberStale',    '15151515-0000-4000-8000-000000000005'),
    ('UserEmail.OutsiderPrimary','15151515-0000-4000-8000-000000000006'),
    ('PasswordReset.Fresh',      '16161616-0000-4000-8000-000000000001'),
    ('PasswordReset.Stale',      '16161616-0000-4000-8000-000000000002'),
    ('PasswordReset.Spent',      '16161616-0000-4000-8000-000000000003');

INSERT INTO "dbo"."Organizations" ("OrganizationUUID", "Name", "IsEnabled", "CreatedBy") VALUES
    ("test"."Fixture"('Organization.Acme'),     'Acme',             true,  'fixtures'),
    ("test"."Fixture"('Organization.Disabled'), 'Disabled Company', false, 'fixtures');

-- Outsider carries no "SubjectId" on purpose: they are the account that
-- predates Keycloak, so dbo.ProvisionUser has a row to claim by login name.
INSERT INTO "dbo"."Users" ("UserUUID", "SubjectId", "Name", "LoginName", "Email", "IsAdmin", "IsEnabled", "CreatedBy") VALUES
    ("test"."Fixture"('User.Owner'),    'subject-owner',    'Olivia Owner',    'owner',    'owner@example.test',    false, true,  'fixtures'),
    ("test"."Fixture"('User.Member'),   'subject-member',   'Marcus Member',   'member',   'member@example.test',   false, true,  'fixtures'),
    ("test"."Fixture"('User.Outsider'), NULL,               'Oscar Outsider',  'outsider', 'outsider@example.test', false, true,  'fixtures'),
    ("test"."Fixture"('User.Admin'),    'subject-admin',    'Ada Admin',       'admin',    'admin@example.test',    true,  true,  'fixtures'),
    ("test"."Fixture"('User.Disabled'), 'subject-disabled', 'Dana Disabled',   'disabled', 'disabled@example.test', false, false, 'fixtures');

INSERT INTO "dbo"."Teams" ("TeamUUID", "OrganizationUUID", "Name", "IsEnabled", "CreatedBy") VALUES
    ("test"."Fixture"('Team.Core'),     "test"."Fixture"('Organization.Acme'), 'Core Team',     true,  'fixtures'),
    ("test"."Fixture"('Team.Support'),  "test"."Fixture"('Organization.Acme'), 'Support Team',  true,  'fixtures'),
    ("test"."Fixture"('Team.Archived'), "test"."Fixture"('Organization.Acme'), 'Archived Team', false, 'fixtures');

INSERT INTO "dbo"."Badges" ("BadgeUUID", "Name", "Description", "Level", "IsEnabled", "CreatedBy") VALUES
    ("test"."Fixture"('Badge.Rookie'),     'Rookie',     'First badge.',      1, true,  'fixtures'),
    ("test"."Fixture"('Badge.Retired'),    'Retired',    'Retired badge.',    4, false, 'fixtures'),
    ("test"."Fixture"('Badge.InProgress'), 'In Progress', 'Half-earned badge.', 2, true,  'fixtures'),
    ("test"."Fixture"('Badge.Revoked'),    'Revoked',    'Badge taken back.', 3, true,  'fixtures');

-- Rarity and expiry live on the owner's badges, so the member's counts -- which
-- several GetBadges tests assert -- stay where they were.
INSERT INTO "dbo"."Badges" ("BadgeUUID", "Name", "Description", "Level", "Rarity", "ExpiresAt", "IsEnabled", "CreatedBy") VALUES
    ("test"."Fixture"('Badge.Rare'),     'Rare Find', 'Hard to get.',   5, 'Rare',   NULL,                     true, 'fixtures'),
    ("test"."Fixture"('Badge.Expiring'), 'Seasonal',  'Lapsed in 2020.', 1, 'Common', '2020-01-01 00:00:00+00', true, 'fixtures');

UPDATE "dbo"."Badges" SET "Rarity" = 'Common', "UpdatedBy" = 'fixtures'
WHERE "BadgeUUID" = "test"."Fixture"('Badge.Rookie');

-- Rookie is a one-step badge the member finished; InProgress needs ten and the
-- member is on four. A badge with no criteria row cannot be progressed against
-- and does not appear in dbo.GetBadgeProgress at all.
INSERT INTO "dbo"."BadgeCriteria" ("BadgeUUID", "Description", "BadgeType", "Value", "CreatedBy") VALUES
    ("test"."Fixture"('Badge.Rookie'),     'Sign up.',    'Activity',    1,  'fixtures'),
    ("test"."Fixture"('Badge.InProgress'), 'Ten actions.', 'Achievement', 10, 'fixtures');

INSERT INTO "dbo"."BadgeGroups" ("BadgeGroupUUID", "Name", "Description", "CreatedBy") VALUES
    ("test"."Fixture"('BadgeGroup.Starter'), 'Starter', 'The first two badges.', 'fixtures');

INSERT INTO "dbo"."BadgeGroupRelationships" ("BadgeUUID", "BadgeGroupUUID", "CreatedBy") VALUES
    ("test"."Fixture"('Badge.Rookie'),     "test"."Fixture"('BadgeGroup.Starter'), 'fixtures'),
    ("test"."Fixture"('Badge.InProgress'), "test"."Fixture"('BadgeGroup.Starter'), 'fixtures');

INSERT INTO "dbo"."SharedBadges" ("UserUUID", "BadgeUUID", "SharedWithUserUUID", "CreatedBy") VALUES
    ("test"."Fixture"('User.Member'), "test"."Fixture"('Badge.Rookie'), "test"."Fixture"('User.Owner'), 'fixtures');

-- Gems carries the expiry policy columns, Points leaves them NULL, so both
-- shapes are exercised. Nothing reads them yet -- see SCHEMA-NOTES.md.
INSERT INTO "dbo"."Points" ("PointUUID", "Name", "Description", "ExpirationDuration", "ResetCondition", "CreatedBy") VALUES
    ("test"."Fixture"('Point.Points'), 'Points', 'General purpose points.', NULL,              NULL,                 'fixtures'),
    ("test"."Fixture"('Point.Gems'),   'Gems',   'Premium currency.',       interval '1 year', 'Start of the year.', 'fixtures');

-- Owner owns Acme; Member and Disabled belong to it; Outsider belongs to
-- nothing. Owner also owns the disabled organization, so ownership alone is
-- not enough to pass IsOwnerOfOrganization.
--
-- Admin is a second owner of the disabled organization and of nothing else.
-- That makes it the one organization an owner can be removed from: Owner is
-- the sole owner of Acme, so dbo.LeaveOrganization refuses to take them out of
-- it. The disabled organization is filtered out of every read function, so the
-- extra row does not move any count another test asserts.
INSERT INTO "dbo"."UserOrganizations" ("UserUUID", "OrganizationUUID", "IsOwner", "CreatedBy") VALUES
    ("test"."Fixture"('User.Owner'),    "test"."Fixture"('Organization.Acme'),     true,  'fixtures'),
    ("test"."Fixture"('User.Member'),   "test"."Fixture"('Organization.Acme'),     false, 'fixtures'),
    ("test"."Fixture"('User.Disabled'), "test"."Fixture"('Organization.Acme'),     false, 'fixtures'),
    ("test"."Fixture"('User.Owner'),    "test"."Fixture"('Organization.Disabled'), true,  'fixtures'),
    ("test"."Fixture"('User.Admin'),    "test"."Fixture"('Organization.Disabled'), true,  'fixtures');

-- One invitation per state the functions branch on: waiting to be answered,
-- offering ownership rather than plain membership, already lapsed, already
-- answered, and attached to a disabled organization. Outsider holds the two
-- addressed to them, and only the Acme one is answerable -- which is what
-- dbo.GetUserInvitations filters down to.
INSERT INTO "dbo"."OrganizationInvitations" ("InvitationUUID", "OrganizationUUID", "Email", "IsOwner", "Status", "InvitedByUserUUID", "ExpiresAt", "RespondedAt", "CreatedBy") VALUES
    ("test"."Fixture"('Invitation.Pending'),     "test"."Fixture"('Organization.Acme'),     'outsider@example.test', false, 'Pending',  "test"."Fixture"('User.Owner'), '2999-01-01 00:00:00+00', NULL,                     'fixtures'),
    ("test"."Fixture"('Invitation.OwnerSeat'),   "test"."Fixture"('Organization.Acme'),     'admin@example.test',    true,  'Pending',  "test"."Fixture"('User.Owner'), '2999-01-01 00:00:00+00', NULL,                     'fixtures'),
    ("test"."Fixture"('Invitation.Expired'),     "test"."Fixture"('Organization.Acme'),     'stranger@example.test', false, 'Pending',  "test"."Fixture"('User.Owner'), '2020-01-01 00:00:00+00', NULL,                     'fixtures'),
    ("test"."Fixture"('Invitation.Declined'),    "test"."Fixture"('Organization.Acme'),     'nobody@example.test',   false, 'Declined', "test"."Fixture"('User.Owner'), '2999-01-01 00:00:00+00', '2024-01-01 00:00:00+00', 'fixtures'),
    ("test"."Fixture"('Invitation.DisabledOrg'), "test"."Fixture"('Organization.Disabled'), 'outsider@example.test', false, 'Pending',  "test"."Fixture"('User.Owner'), '2999-01-01 00:00:00+00', NULL,                     'fixtures');

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
    ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Revoked'),    '2024-03-01 00:00:00+00', 'Earned in error',  1,  1, '2024-04-01 00:00:00+00', 'fixtures'),
    ("test"."Fixture"('User.Owner'),  "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Rare'),       '2024-05-01 00:00:00+00', 'Found it',         1,  1, NULL,                     'fixtures'),
    ("test"."Fixture"('User.Owner'),  "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Expiring'),   '2024-06-01 00:00:00+00', 'Seasonal award',   1,  1, NULL,                     'fixtures');

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

INSERT INTO "dbo"."Roadmaps" ("RoadmapUUID", "OrganizationUUID", "Name", "Description", "IsEnabled", "CreatedBy") VALUES
    ("test"."Fixture"('Roadmap.Launch'),   "test"."Fixture"('Organization.Acme'), 'Launch',   'The live roadmap.', true,  'fixtures'),
    ("test"."Fixture"('Roadmap.Archived'), "test"."Fixture"('Organization.Acme'), 'Archived', 'Shut down.',        false, 'fixtures');

-- One of everything the task reads branch on: a plain pending task, one in
-- progress, one overdue, one completed, one cancelled while already past its
-- due date, and one with no roadmap at all -- which is why Tasks carries
-- OrganizationUUID itself rather than reaching it through Roadmaps.
-- Task.Build depends on Task.Design.
--
-- Task.Cancelled is the one that catches a lazy overdue filter: it is past due
-- and not Completed, so "DueDate < now AND Status <> 'Completed'" reports it.
INSERT INTO "dbo"."Tasks" ("TaskUUID", "OrganizationUUID", "RoadmapUUID", "Name", "Description", "Category", "Priority", "Status", "SortOrder", "DueDate", "AssignedUserUUID", "CreatedBy") VALUES
    ("test"."Fixture"('Task.Design'),  "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Roadmap.Launch'), 'Design',  'Draw it up.',    'Design', 2, 'Completed',  1, '2024-01-01', "test"."Fixture"('User.Member'), 'fixtures'),
    ("test"."Fixture"('Task.Build'),   "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Roadmap.Launch'), 'Build',   'Write it.',      'Build',  3, 'InProgress', 2, '2999-01-01', "test"."Fixture"('User.Member'), 'fixtures'),
    ("test"."Fixture"('Task.Overdue'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Roadmap.Launch'), 'Ship',    'Late already.',  'Build',  1, 'Pending',    3, '2020-01-01', "test"."Fixture"('User.Owner'),  'fixtures'),
    ("test"."Fixture"('Task.Done'),    "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Roadmap.Launch'), 'Retro',   'Finished late.', 'Admin',  0, 'Completed',  4, '2020-06-01', NULL,                            'fixtures'),
    ("test"."Fixture"('Task.Loose'),   "test"."Fixture"('Organization.Acme'), NULL,                               'Standalone', 'No roadmap.', NULL,     0, 'Pending',    0, NULL,         NULL,                            'fixtures'),
    ("test"."Fixture"('Task.Cancelled'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Roadmap.Launch'), 'Dropped', 'Called off, already late.', NULL, 0, 'Cancelled', 5, '2020-03-01', NULL,                         'fixtures');

INSERT INTO "dbo"."TaskDependencies" ("DependentTaskUUID", "PrerequisiteTaskUUID", "CreatedBy") VALUES
    ("test"."Fixture"('Task.Build'), "test"."Fixture"('Task.Design'), 'fixtures');

INSERT INTO "dbo"."TaskComments" ("TaskUUID", "UserUUID", "Comment", "CreatedBy") VALUES
    ("test"."Fixture"('Task.Build'), "test"."Fixture"('User.Member'), 'Started on this.', 'fixtures');

-- The UserUUID is NULL on the second row: not every change has a person behind it.
INSERT INTO "dbo"."TaskHistory" ("TaskUUID", "UserUUID", "ChangeType", "OldValue", "NewValue", "ChangedAt", "CreatedBy") VALUES
    ("test"."Fixture"('Task.Build'), "test"."Fixture"('User.Member'), 'Status',  'Pending', 'InProgress', '2024-02-01 00:00:00+00', 'fixtures'),
    ("test"."Fixture"('Task.Build'), NULL,                            'DueDate', NULL,      '2999-01-01', '2024-02-02 00:00:00+00', 'fixtures');

INSERT INTO "dbo"."AssignmentHistory" ("TaskUUID", "PreviousUserUUID", "NewUserUUID", "AssignedAt", "CreatedBy") VALUES
    ("test"."Fixture"('Task.Build'), NULL,                           "test"."Fixture"('User.Member'), '2024-01-15 00:00:00+00', 'fixtures'),
    ("test"."Fixture"('Task.Done'),  "test"."Fixture"('User.Owner'), NULL,                            '2024-07-01 00:00:00+00', 'fixtures');

INSERT INTO "dbo"."Checklists" ("TaskUUID", "Description", "IsCompleted", "SortOrder", "CreatedBy") VALUES
    ("test"."Fixture"('Task.Build'), 'Write the schema.', true,  1, 'fixtures'),
    ("test"."Fixture"('Task.Build'), 'Write the tests.',  false, 2, 'fixtures');

INSERT INTO "dbo"."Labels" ("LabelUUID", "OrganizationUUID", "Name", "CreatedBy") VALUES
    ("test"."Fixture"('Label.Urgent'), "test"."Fixture"('Organization.Acme'), 'Urgent', 'fixtures'),
    ("test"."Fixture"('Label.Chore'),  "test"."Fixture"('Organization.Acme'), 'Chore',  'fixtures');

INSERT INTO "dbo"."TaskLabels" ("TaskUUID", "LabelUUID", "CreatedBy") VALUES
    ("test"."Fixture"('Task.Build'),   "test"."Fixture"('Label.Urgent'), 'fixtures'),
    ("test"."Fixture"('Task.Overdue'), "test"."Fixture"('Label.Urgent'), 'fixtures');

-- A two-stage workflow. Only the owner may decide at Finance, which is what
-- makes "the permission table is not enforced" testable.
INSERT INTO "dbo"."ApprovalWorkflows" ("ApprovalWorkflowUUID", "OrganizationUUID", "Name", "Description", "CreatedBy") VALUES
    ("test"."Fixture"('Workflow.Redemption'), "test"."Fixture"('Organization.Acme'), 'Redemption', 'Approving a point redemption.', 'fixtures');

INSERT INTO "dbo"."ApprovalWorkflowStages" ("ApprovalWorkflowStageUUID", "ApprovalWorkflowUUID", "Name", "SortOrder", "CreatedBy") VALUES
    ("test"."Fixture"('Stage.Manager'), "test"."Fixture"('Workflow.Redemption'), 'Manager', 1, 'fixtures'),
    ("test"."Fixture"('Stage.Finance'), "test"."Fixture"('Workflow.Redemption'), 'Finance', 2, 'fixtures');

INSERT INTO "dbo"."ApprovalWorkflowPermissions" ("ApprovalWorkflowStageUUID", "UserUUID", "CreatedBy") VALUES
    ("test"."Fixture"('Stage.Manager'), "test"."Fixture"('User.Member'), 'fixtures'),
    ("test"."Fixture"('Stage.Finance'), "test"."Fixture"('User.Owner'),  'fixtures');

-- One request part-way through (past Manager, sitting at Finance) and one that
-- has left the stages entirely -- a NULL CurrentStageUUID is what finished
-- looks like. Both approve a point redemption; the subject check allows only
-- one of the three subject columns per row.
INSERT INTO "dbo"."ApprovalRequests" ("ApprovalRequestUUID", "OrganizationUUID", "ApprovalWorkflowUUID", "CurrentStageUUID", "RequestedByUserUUID", "RequestText", "Status", "PointRedemptionUUID", "CreatedBy") VALUES
    ("test"."Fixture"('Request.AtFinance'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Workflow.Redemption'), "test"."Fixture"('Stage.Finance'), "test"."Fixture"('User.Member'), 'Coffee voucher, please.', 'Pending',  "test"."Fixture"('PointRedemption.Pending'),  'fixtures'),
    ("test"."Fixture"('Request.Finished'),  "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Workflow.Redemption'), NULL,                              "test"."Fixture"('User.Member'), 'Sticker pack, please.',   'Approved', "test"."Fixture"('PointRedemption.Approved'), 'fixtures');

INSERT INTO "dbo"."ApprovalDecisions" ("ApprovalRequestUUID", "ApprovalWorkflowStageUUID", "ApproverUserUUID", "Status", "Comment", "DecidedAt", "CreatedBy") VALUES
    ("test"."Fixture"('Request.AtFinance'), "test"."Fixture"('Stage.Manager'), "test"."Fixture"('User.Member'), 'Approved', 'Fine by me.',  '2024-03-01 00:00:00+00', 'fixtures'),
    ("test"."Fixture"('Request.Finished'),  "test"."Fixture"('Stage.Manager'), "test"."Fixture"('User.Member'), 'Approved', 'Sure.',        '2024-04-01 00:00:00+00', 'fixtures'),
    ("test"."Fixture"('Request.Finished'),  "test"."Fixture"('Stage.Finance'), "test"."Fixture"('User.Owner'),  'Approved', 'Budget fits.', '2024-04-02 00:00:00+00', 'fixtures');

INSERT INTO "dbo"."ApprovalRequestLogs" ("ApprovalRequestUUID", "FromStageUUID", "ToStageUUID", "Comment", "LoggedAt", "CreatedBy") VALUES
    ("test"."Fixture"('Request.AtFinance'), NULL,                              "test"."Fixture"('Stage.Manager'), 'Raised.',   '2024-02-28 00:00:00+00', 'fixtures'),
    ("test"."Fixture"('Request.AtFinance'), "test"."Fixture"('Stage.Manager'), "test"."Fixture"('Stage.Finance'), 'Passed on.', '2024-03-01 00:00:00+00', 'fixtures'),
    ("test"."Fixture"('Request.Finished'),  "test"."Fixture"('Stage.Finance'), NULL,                              'Done.',      '2024-04-02 00:00:00+00', 'fixtures');

INSERT INTO "dbo"."Surveys" ("SurveyUUID", "OrganizationUUID", "Name", "Description", "OpensAt", "ClosesAt", "CreatedBy") VALUES
    ("test"."Fixture"('Survey.Pulse'), "test"."Fixture"('Organization.Acme'), 'Pulse', 'How is it going?', '2024-01-01 00:00:00+00', '2999-01-01 00:00:00+00', 'fixtures');

INSERT INTO "dbo"."SurveyQuestions" ("SurveyQuestionUUID", "SurveyUUID", "QuestionText", "QuestionType", "SortOrder", "IsRequired", "CreatedBy") VALUES
    ("test"."Fixture"('Question.Choice'), "test"."Fixture"('Survey.Pulse'), 'Would you recommend us?', 'Choice', 1, true,  'fixtures'),
    ("test"."Fixture"('Question.Text'),   "test"."Fixture"('Survey.Pulse'), 'Anything to add?',        'Text',   2, false, 'fixtures');

INSERT INTO "dbo"."SurveyQuestionOptions" ("SurveyQuestionOptionUUID", "SurveyQuestionUUID", "OptionText", "SortOrder", "CreatedBy") VALUES
    ("test"."Fixture"('Option.Yes'), "test"."Fixture"('Question.Choice'), 'Yes', 1, 'fixtures'),
    ("test"."Fixture"('Option.No'),  "test"."Fixture"('Question.Choice'), 'No',  2, 'fixtures');

-- The member finished, the owner was invited and has not.
INSERT INTO "dbo"."SurveyParticipants" ("SurveyParticipantUUID", "SurveyUUID", "UserUUID", "InvitedAt", "CompletedAt", "CreatedBy") VALUES
    ("test"."Fixture"('Participant.Member'), "test"."Fixture"('Survey.Pulse'), "test"."Fixture"('User.Member'), '2024-01-02 00:00:00+00', '2024-01-05 00:00:00+00', 'fixtures'),
    ("test"."Fixture"('Participant.Owner'),  "test"."Fixture"('Survey.Pulse'), "test"."Fixture"('User.Owner'),  '2024-01-02 00:00:00+00', NULL,                     'fixtures');

-- One chosen option and one free-text answer, which is the pair the check
-- constraint and the NULLS NOT DISTINCT unique key both hinge on.
INSERT INTO "dbo"."SurveyAnswers" ("SurveyParticipantUUID", "SurveyQuestionUUID", "SurveyQuestionOptionUUID", "AnswerText", "CreatedBy") VALUES
    ("test"."Fixture"('Participant.Member'), "test"."Fixture"('Question.Choice'), "test"."Fixture"('Option.Yes'), NULL,              'fixtures'),
    ("test"."Fixture"('Participant.Member'), "test"."Fixture"('Question.Text'),   NULL,                           'Keep it up.',     'fixtures');

INSERT INTO "dbo"."Roles" ("RoleUUID", "OrganizationUUID", "Name", "Description", "CreatedBy") VALUES
    ("test"."Fixture"('Role.Lead'),     "test"."Fixture"('Organization.Acme'), 'Lead',     'Runs the team.',  'fixtures'),
    ("test"."Fixture"('Role.Reviewer'), "test"."Fixture"('Organization.Acme'), 'Reviewer', 'Reviews work.',   'fixtures');

-- The member holds both roles; nothing in the schema reads them.
INSERT INTO "dbo"."UserRoles" ("UserUUID", "RoleUUID", "CreatedBy") VALUES
    ("test"."Fixture"('User.Member'), "test"."Fixture"('Role.Lead'),     'fixtures'),
    ("test"."Fixture"('User.Member'), "test"."Fixture"('Role.Reviewer'), 'fixtures');

-- One unread and one read, which is the only question this table answers. One
-- has an actor and one has none, which is the other thing a reader has to cope
-- with: the owner assigned the task, and nobody in particular said welcome.
INSERT INTO "dbo"."Notifications" ("NotificationUUID", "UserUUID", "OrganizationUUID", "TaskUUID", "ActorUUID", "NotificationType", "Message", "ReadAt", "CreatedBy") VALUES
    ("test"."Fixture"('Notification.Unread'), "test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Task.Build'), "test"."Fixture"('User.Owner'), 'Assigned', 'You have a new task.', NULL,                     'fixtures'),
    ("test"."Fixture"('Notification.Read'),   "test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), NULL,                           NULL,                           'Welcome',  'Welcome aboard.',      '2024-01-03 00:00:00+00', 'fixtures');

INSERT INTO "dbo"."AccessControlLists" ("UserUUID", "TaskUUID", "PermissionType", "CreatedBy") VALUES
    ("test"."Fixture"('User.Member'),   "test"."Fixture"('Task.Build'), 'Write', 'fixtures'),
    ("test"."Fixture"('User.Outsider'), "test"."Fixture"('Task.Build'), 'Read',  'fixtures');

-- One on a task, one on a comment. Never both, never neither.
INSERT INTO "dbo"."Attachments" ("TaskUUID", "TaskCommentUUID", "FileName", "FilePath", "CreatedBy") VALUES
    ("test"."Fixture"('Task.Build'), NULL, 'spec.pdf', '/files/spec.pdf', 'fixtures'),
    (NULL, (SELECT "TaskCommentUUID" FROM "dbo"."TaskComments" WHERE "TaskUUID" = "test"."Fixture"('Task.Build')), 'screenshot.png', '/files/screenshot.png', 'fixtures');

-- Two feed rows and one audit row, which is what IsUserVisible separates.
INSERT INTO "dbo"."EventLog" ("OrganizationUUID", "UserUUID", "EventType", "Description", "IsUserVisible", "OccurredAt", "CreatedBy") VALUES
    ("test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'), 'TaskAssigned',  'Marcus picked up Build.', true,  '2024-01-15 00:00:00+00', 'fixtures'),
    ("test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'), 'BadgeEarned',   'Marcus earned Rookie.',   true,  '2024-01-01 00:00:00+00', 'fixtures'),
    (NULL,                                  NULL,                            'SchemaApplied', 'Nightly rebuild.',        false, '2024-01-20 00:00:00+00', 'fixtures');

-- The address list. One of everything dbo.GetUserEmails and its writers branch
-- on: a primary, a verified address that is not the primary, an unverified one
-- whose link still works, and an unverified one whose link has expired.
--
-- The primaries repeat what dbo.Users."Email" already holds for the same
-- accounts, which is not duplication for its own sake: that is the state
-- dbo.ProvisionUser leaves behind on every sign-in, and a test that started
-- from the two disagreeing would be testing a world that does not happen.
--
-- The owner and the outsider hold a primary and nothing else, so there is an
-- account with one address to compare against the member's four. The outsider
-- has one because dbo.AcceptOrganizationInvitation matches on this table now,
-- and Invitation.Pending is addressed to them.
--
-- Disabled holds no row at all, which is the account that predates this table:
-- a column and no rows is exactly what an installation looks like before its
-- users have signed in again, and both invitation functions still have to cope
-- with it.
--
-- "VerificationSentAt" is written relative to now rather than as a literal,
-- because dbo.VerifyUserEmail measures a link's twenty-four hours from it. A
-- fixed timestamp would start fresh and quietly become expired as the suite
-- aged, which is the kind of test that fails on a Tuesday for no reason.
INSERT INTO "dbo"."UserEmails" ("UserEmailUUID", "UserUUID", "Email", "IsPrimary", "VerifiedAt", "VerificationToken", "VerificationSentAt", "CreatedBy") VALUES
    ("test"."Fixture"('UserEmail.OwnerPrimary'),    "test"."Fixture"('User.Owner'),    'owner@example.test',       true,  '2024-01-01 00:00:00+00', NULL,                 NULL,                                     'fixtures'),
    ("test"."Fixture"('UserEmail.MemberPrimary'),   "test"."Fixture"('User.Member'),   'member@example.test',      true,  '2024-01-01 00:00:00+00', NULL,                 NULL,                                     'fixtures'),
    ("test"."Fixture"('UserEmail.MemberWork'),      "test"."Fixture"('User.Member'),   'marcus.work@example.test', false, '2024-02-01 00:00:00+00', NULL,                 NULL,                                     'fixtures'),
    ("test"."Fixture"('UserEmail.MemberFresh'),     "test"."Fixture"('User.Member'),   'marcus.new@example.test',  false, NULL,                     'token-fresh',        CURRENT_TIMESTAMP - interval '1 hour',    'fixtures'),
    ("test"."Fixture"('UserEmail.MemberStale'),     "test"."Fixture"('User.Member'),   'marcus.old@example.test',  false, NULL,                     'token-stale',        CURRENT_TIMESTAMP - interval '48 hours',  'fixtures'),
    ("test"."Fixture"('UserEmail.OutsiderPrimary'), "test"."Fixture"('User.Outsider'), 'outsider@example.test',    true,  '2024-01-01 00:00:00+00', NULL,                 NULL,                                     'fixtures');

--
-- Password reset links, one of each state dbo.SpendPasswordReset branches on:
-- one still good, one whose hour has passed, and one that has already been
-- followed.
--
-- They name the member by Keycloak "sub" rather than by "UserUUID", because
-- the table does: a reset is about an account in the identity provider, and
-- the row here may well be the only thing this database knows about it.
--
-- "SentAt" is written relative to now for the reason the verification tokens
-- are: the hour is measured from it, so a literal would start fresh and
-- quietly go stale as the suite aged.
INSERT INTO "dbo"."PasswordResets" ("PasswordResetUUID", "SubjectId", "Token", "SentAt", "SpentAt", "CreatedBy") VALUES
    ("test"."Fixture"('PasswordReset.Fresh'), 'subject-member', 'reset-fresh', CURRENT_TIMESTAMP - interval '10 minutes', NULL,                                      'fixtures'),
    ("test"."Fixture"('PasswordReset.Stale'), 'subject-member', 'reset-stale', CURRENT_TIMESTAMP - interval '2 hours',    NULL,                                      'fixtures'),
    ("test"."Fixture"('PasswordReset.Spent'), 'subject-owner',  'reset-spent', CURRENT_TIMESTAMP - interval '20 minutes', CURRENT_TIMESTAMP - interval '15 minutes', 'fixtures');
