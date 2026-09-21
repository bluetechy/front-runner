CREATE TABLE "dbo"."Users" (
    "UserUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "Name" varchar(64) NOT NULL,
    "LoginName" varchar(64) NOT NULL,
    "Email" varchar(255) NOT NULL DEFAULT '',
    "IsAdmin" boolean NOT NULL DEFAULT false,
    "IsEnabled" boolean NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "Users_LoginName_UniqueKey" UNIQUE ("LoginName")
);
