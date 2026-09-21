CREATE TABLE "dbo"."UserPoints" (
    "UserPointUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "UserUUID" uuid NOT NULL,
    "OrganizationUUID" uuid NOT NULL,
    "PointUUID" uuid NOT NULL,
    "Description" text NOT NULL, -- human-readable, shown to the user
    "Reason" varchar(64), -- machine-readable category, for filtering a ledger by kind
    "Details" jsonb, -- whatever the awarding feature needs to keep about this row
    "Amount" decimal(19,4) NOT NULL,
    "ExpiresAt" TIMESTAMPTZ,
    -- Set when this row exists only to undo another one. Unique, so a
    -- transaction can be reversed once and not twice.
    "ReversesUserPointUUID" uuid,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "UserPoints_Reverses_UniqueKey" UNIQUE ("ReversesUserPointUUID")
);
