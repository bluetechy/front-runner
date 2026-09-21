--
-- Points moving from one user to another inside an organization. Like
-- dbo.PointRedemptions this is the record, not the movement: settling a
-- transfer means writing the matching pair of dbo.UserPoints rows.
--
CREATE TABLE "dbo"."PointTransfers" (
    "PointTransferUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "OrganizationUUID" uuid NOT NULL,
    "PointUUID" uuid NOT NULL,
    "SenderUserUUID" uuid NOT NULL,
    "ReceiverUserUUID" uuid NOT NULL,
    "Amount" decimal(19,4) NOT NULL, -- positive; it leaves the sender and reaches the receiver
    "Description" text,
    "Status" varchar(20) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Completed', 'Cancelled'
    "TransferredAt" TIMESTAMPTZ, -- NULL until the transfer settles
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);
