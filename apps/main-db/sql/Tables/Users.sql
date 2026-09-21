--
-- A person's account, global to the installation and independent of any
-- organization -- the GitHub/Cloudflare shape. Membership lives in
-- dbo.UserOrganizations and is joined and left there; nothing here says which
-- organization a user belongs to, and an account with no memberships is a
-- normal state rather than an orphan.
--
-- "SubjectId" is the Keycloak `sub` claim and is the real identity: Keycloak
-- guarantees it is immutable, while "LoginName" and "Email" are both things a
-- user can change. It is nullable because an account can predate the identity
-- provider -- seeded and imported rows carry NULL until their owner signs in
-- and dbo.ProvisionUser claims the row. Every account that has ever
-- authenticated has one.
--
CREATE TABLE "dbo"."Users" (
    "UserUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "SubjectId" varchar(255), -- Keycloak "sub"; NULL until the account's first sign-in
    "Name" varchar(64) NOT NULL,
    "LoginName" varchar(64) NOT NULL,
    "Email" varchar(255) NOT NULL DEFAULT '',
    "IsAdmin" boolean NOT NULL DEFAULT false,
    "IsEnabled" boolean NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "Users_LoginName_UniqueKey" UNIQUE ("LoginName"),
    CONSTRAINT "Users_SubjectId_UniqueKey" UNIQUE ("SubjectId")
);
