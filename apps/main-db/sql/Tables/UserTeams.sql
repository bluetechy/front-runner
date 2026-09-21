CREATE TABLE "dbo"."UserTeams" (
    "UserUUID" uuid NOT NULL,
    "TeamUUID" uuid NOT NULL,
    "IsManager" boolean NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "UserTeams_UUIDs_UniqueKey" UNIQUE ("UserUUID", "TeamUUID")
);
