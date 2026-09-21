CREATE TABLE "dbo"."UserTallies" (
    "UserUUID" uuid NOT NULL,
    "OrganizationUUID" uuid NOT NULL,
    "PointUUID" uuid NOT NULL,
    "Amount" decimal(19,4) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "UserTallies_UUIDs_UniqueKey" UNIQUE ("OrganizationUUID", "UserUUID", "PointUUID")
);
