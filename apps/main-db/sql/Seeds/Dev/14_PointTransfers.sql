--
-- Peer-to-peer transfers, Pending and Completed. As with the redemptions above,
-- a Completed row has still not moved anyone's tally -- settling one means
-- writing the matching pair of dbo.UserPoints rows.
--

INSERT INTO "dbo"."PointTransfers" ("PointTransferUUID", "OrganizationUUID", "PointUUID", "SenderUserUUID", "ReceiverUserUUID", "Amount", "Description", "Status", "TransferredAt", "CreatedBy") VALUES
    ('14000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 20.0000, 'Thanks for the review.',   'Completed', '2025-03-11 00:00:00+00', 'seed'),
    ('14000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000006', 10.0000, 'Covering the on-call.',    'Completed', '2025-04-19 00:00:00+00', 'seed'),
    ('14000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000007', 15.0000, 'Awaiting approval.',       'Pending',   NULL,                     'seed'),
    ('14000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000008',  2.0000, 'A couple of gems.',        'Pending',   NULL,                     'seed'),
    ('14000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000009', 30.0000, 'Cancelled before it ran.', 'Cancelled', NULL,                     'seed'),
    ('14000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-00000000000a', 25.0000, 'Founding thank-you.',      'Completed', '2025-05-02 00:00:00+00', 'seed')
ON CONFLICT ("PointTransferUUID") DO UPDATE SET
    "Amount" = EXCLUDED."Amount",
    "Description" = EXCLUDED."Description",
    "Status" = EXCLUDED."Status",
    "TransferredAt" = EXCLUDED."TransferredAt",
    "UpdatedBy" = 'seed';
