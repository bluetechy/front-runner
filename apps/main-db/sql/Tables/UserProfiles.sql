--
-- What a person chooses to say about themselves: the profile page's fields,
-- one row per account, created the first time anything is saved.
--
-- Separate from dbo.Users because the two have different owners. Everything in
-- dbo.Users that identifies somebody -- "Name", "LoginName", "Email" -- is a
-- copy of what Keycloak holds, refreshed from the token on every sign-in by
-- dbo.ProvisionUser, so a value written there by hand survives only until the
-- next one. Nothing in here comes from a token, so nothing in here is
-- overwritten; this is the application's own record, and it is the only place
-- a profile edit may land.
--
-- "FirstName" and "LastName" are this record's, not Keycloak's: Keycloak
-- issues one display name and a person may want to be presented differently
-- here. They are empty until somebody sets them, and a reader with nothing to
-- show falls back to the account's "Name".
--
-- Every text column is NOT NULL DEFAULT '' rather than nullable, the way
-- dbo.Users."Email" already is: an unanswered field and a field answered with
-- nothing are the same thing to a profile, and one representation means no
-- reader has to handle both.
--
CREATE TABLE "dbo"."UserProfiles" (
    "UserProfileUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "UserUUID" uuid NOT NULL,
    "FirstName" varchar(64) NOT NULL DEFAULT '',
    "LastName" varchar(64) NOT NULL DEFAULT '',
    "NickName" varchar(64) NOT NULL DEFAULT '',
    "Designation" varchar(64) NOT NULL DEFAULT '',
    "Biography" varchar(2000) NOT NULL DEFAULT '',
    -- A BCP 47 tag ("en-US"), not a language's name in itself: what is stored
    -- has to survive the interface being translated.
    "Language" varchar(32) NOT NULL DEFAULT 'en-US',
    "Phone" varchar(32) NOT NULL DEFAULT '',
    "Address" varchar(255) NOT NULL DEFAULT '',
    "Website" varchar(255) NOT NULL DEFAULT '',
    "Twitter" varchar(255) NOT NULL DEFAULT '',
    "Facebook" varchar(255) NOT NULL DEFAULT '',
    "LinkedIn" varchar(255) NOT NULL DEFAULT '',
    "Github" varchar(255) NOT NULL DEFAULT '',
    "WantsAwardEmails" boolean NOT NULL DEFAULT true,
    "WantsDigestEmails" boolean NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    -- One profile per account, and the key dbo.SetUserProfile upserts on.
    CONSTRAINT "UserProfiles_UserUUID_UniqueKey" UNIQUE ("UserUUID")
);
