CREATE TABLE "dbo"."UserTallies" (
    "UserUUID" uuid NOT NULL,
    "OrganizationUUID" uuid NOT NULL,
    "PointUUID" uuid NOT NULL,
    "Amount" decimal(19,4) NOT NULL,
    -- Policy, not derived state. calculate_tallies rewrites "Amount" on every
    -- point row but never these, so a limit set here survives.
    "DailyLimit" decimal(19,4), -- most of this point type the user may earn in a day, NULL for no limit
    "SpendLimit" decimal(19,4), -- most they may spend, NULL for no limit
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "UserTallies_UUIDs_UniqueKey" UNIQUE ("OrganizationUUID", "UserUUID", "PointUUID")
);
