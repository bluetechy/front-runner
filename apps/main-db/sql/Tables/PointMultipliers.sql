--
-- A window during which awards are worth more. Nothing applies it yet: the
-- multiplier has to be worked into whatever writes dbo.UserPoints, because the
-- amount stored there is what dbo.calculate_tallies sums.
--
CREATE TABLE "dbo"."PointMultipliers" (
    "PointMultiplierUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "Name" varchar(64) NOT NULL,
    "Description" text,
    "Factor" decimal(19,4) NOT NULL, -- 2.0000 doubles the award
    "StartsAt" TIMESTAMPTZ,
    "EndsAt" TIMESTAMPTZ,
    "IsEnabled" boolean NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);
