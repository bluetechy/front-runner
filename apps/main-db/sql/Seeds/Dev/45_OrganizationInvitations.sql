--
-- Invitations in every state the invitation functions branch on, so the API
-- has something to read without issuing one first. "pkowalski" is the seed's
-- outsider -- they belong to no organization and hold the one invitation that
-- can actually be accepted.
--
-- Addresses are stored folded to lower case, the way dbo.InviteToOrganization
-- writes them. A row written in any other case would never match the account
-- that is supposed to hold it.
--

INSERT INTO "dbo"."OrganizationInvitations" ("InvitationUUID", "OrganizationUUID", "Email", "IsOwner", "Status", "InvitedByUserUUID", "ExpiresAt", "RespondedAt", "CreatedBy") VALUES
    ('c1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'piotr.kowalski@northwind.test', false, 'Pending',  'b0000000-0000-4000-8000-000000000002', CURRENT_TIMESTAMP + interval '14 days', NULL,                     'seed'),
    ('c1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'newhire@northwind.test',        false, 'Pending',  'b0000000-0000-4000-8000-000000000002', CURRENT_TIMESTAMP + interval '14 days', NULL,                     'seed'),
    ('c1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'newlead@bluetechy.test',        true,  'Pending',  'b0000000-0000-4000-8000-000000000003', CURRENT_TIMESTAMP + interval '14 days', NULL,                     'seed'),
    ('c1000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002', 'declined@northwind.test',       false, 'Declined', 'b0000000-0000-4000-8000-000000000003', CURRENT_TIMESTAMP + interval '14 days', '2026-01-01 00:00:00+00', 'seed'),
    ('c1000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'lapsed@northwind.test',         false, 'Pending',  'b0000000-0000-4000-8000-000000000002', '2020-01-01 00:00:00+00',               NULL,                     'seed')
ON CONFLICT ("InvitationUUID") DO UPDATE SET
    "OrganizationUUID" = EXCLUDED."OrganizationUUID",
    "Email" = EXCLUDED."Email",
    "IsOwner" = EXCLUDED."IsOwner",
    "Status" = EXCLUDED."Status",
    "InvitedByUserUUID" = EXCLUDED."InvitedByUserUUID",
    "ExpiresAt" = EXCLUDED."ExpiresAt",
    "RespondedAt" = EXCLUDED."RespondedAt",
    "UpdatedBy" = 'seed';
