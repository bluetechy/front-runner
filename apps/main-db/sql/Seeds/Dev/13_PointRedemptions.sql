--
-- Requests to spend points, in each of the three states. None of them has
-- moved a balance: settling a redemption means writing a negative
-- dbo.UserPoints row, and nothing in this dataset does. That is deliberate --
-- it is the difference between the paperwork and the money.
--

INSERT INTO "dbo"."PointRedemptions" ("PointRedemptionUUID", "UserUUID", "OrganizationUUID", "PointUUID", "Amount", "Description", "Status", "RedeemedAt", "CreatedBy") VALUES
    ('13000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',  25.0000, 'Coffee shop voucher.',   'Approved', '2025-04-02 00:00:00+00', 'seed'),
    ('13000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',  40.0000, 'Conference ticket.',     'Pending',  NULL,                     'seed'),
    ('13000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 100.0000, 'Standing desk.',         'Approved', '2025-05-20 00:00:00+00', 'seed'),
    ('13000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 500.0000, 'More than he holds.',    'Rejected', NULL,                     'seed'),
    ('13000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002',   5.0000, 'Gem-funded sticker set.', 'Pending', NULL,                     'seed'),
    ('13000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001',  60.0000, 'Team lunch.',            'Approved', '2025-06-11 00:00:00+00', 'seed')
ON CONFLICT ("PointRedemptionUUID") DO UPDATE SET
    "Amount" = EXCLUDED."Amount",
    "Description" = EXCLUDED."Description",
    "Status" = EXCLUDED."Status",
    "RedeemedAt" = EXCLUDED."RedeemedAt",
    "UpdatedBy" = 'seed';
