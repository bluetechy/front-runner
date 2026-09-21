--
-- A request to spend points, and where it got to. This table is the paperwork,
-- not the money: the balance only moves when a negative dbo.UserPoints row is
-- written, because that is what dbo.calculate_tallies sums.
--
CREATE TABLE "dbo"."PointRedemptions" (
    "PointRedemptionUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "UserUUID" uuid NOT NULL,
    "OrganizationUUID" uuid NOT NULL,
    "PointUUID" uuid NOT NULL, -- which currency is being spent
    "Amount" decimal(19,4) NOT NULL, -- positive; the direction is implied by the table
    "Description" text NOT NULL, -- what the points were spent on
    "Status" varchar(20) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    "RedeemedAt" TIMESTAMPTZ, -- NULL until the redemption is approved and settled
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);
