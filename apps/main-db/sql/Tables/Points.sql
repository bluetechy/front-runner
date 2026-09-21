CREATE TABLE "dbo"."Points" (
    "PointUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "Name" varchar(64) NOT NULL,
    "Description" text NOT NULL,
    "CalculationFrequency" varchar(8) NOT NULL DEFAULT '*/1',
    "ExpirationDuration" interval, -- how long a UserPoints row of this type stays good, NULL for forever
    "ResetCondition" text, -- when a balance of this type goes back to zero
    "IsEnabled" boolean NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);
