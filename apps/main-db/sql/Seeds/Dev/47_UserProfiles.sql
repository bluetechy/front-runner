--
-- THIS IS TEST DATA. Fake demo rows for local development, on the reserved
-- and unroutable @northwind.test domain. Nothing here belongs to a real
-- person and nothing here should ever reach a real installation.
--
-- One row, and it is here for one column. "EmailIsPrivate" is true for every
-- account that has one of these rows and for every account that does not:
-- the column defaults to true, dbo.GetUserProfile reads a missing row as
-- true, and dbo.ProvisionUser writes the row saying so when it creates an
-- account. A seeded account is claimed rather than created, so it never goes
-- through that insert, and this file is what gives the demo account the state
-- a real new account would already be in.
--
-- jdoe is the account the security page is demonstrated on -- she is the one
-- carrying an unverified address with a live link in 46_UserEmails.sql -- so
-- she is the one whose switch has to read Private when the page is opened.
--
-- Everything else on the row is left at its default, which is what the
-- profile page would show for an account nobody has filled in. This is a
-- privacy setting, not a seeded profile.
--

INSERT INTO "dbo"."UserProfiles" ("UserProfileUUID", "UserUUID", "EmailIsPrivate", "CreatedBy") VALUES
    ('b2000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', true, 'seed')
-- The unique key on "UserUUID" rather than the primary key, because the row
-- this is most likely to land on is one dbo.SetUserEmailPrivacy wrote while
-- somebody was clicking around in development, and that one carries a
-- generated "UserProfileUUID". One profile per account is what makes the row
-- the same row, so that is the constraint to upsert on. See
-- apps/main-db/CLAUDE.md on naming it rather than inferring it.
ON CONFLICT ON CONSTRAINT "UserProfiles_UserUUID_UniqueKey" DO UPDATE SET
    "EmailIsPrivate" = EXCLUDED."EmailIsPrivate",
    "UpdatedBy" = 'seed';
