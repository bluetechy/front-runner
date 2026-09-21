--
-- An offer of organization membership, awaiting the invitee's answer. This is
-- the only route into dbo.UserOrganizations for somebody who is not already a
-- member: an owner invites an address, and the account holding that address
-- decides. Nobody is added to an organization without their consent, which is
-- what the function this replaced -- dbo.JoinOrganization -- allowed.
--
-- Addressed by "Email" rather than "UserUUID" because an invitation can
-- precede the account. The invitee may never have signed in, in which case no
-- dbo.Users row exists yet; the invitation waits for them.
--
-- One row per (organization, address). Re-inviting an address that declined
-- moves that row back to Pending rather than adding a second one, so the table
-- answers "where does this address stand with this organization" with exactly
-- one row. "AcceptedByUserUUID" records which account took an invitation up,
-- which is not derivable from the address once a user changes it.
--
CREATE TABLE "dbo"."OrganizationInvitations" (
    "InvitationUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "OrganizationUUID" uuid NOT NULL,
    "Email" varchar(255) NOT NULL, -- stored folded to lower case by the functions
    "IsOwner" boolean NOT NULL DEFAULT false, -- the role acceptance grants
    "Status" varchar(16) NOT NULL DEFAULT 'Pending',
    "InvitedByUserUUID" uuid NOT NULL,
    "AcceptedByUserUUID" uuid, -- NULL unless "Status" is Accepted
    "ExpiresAt" TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + interval '14 days'),
    "RespondedAt" TIMESTAMPTZ, -- NULL while still Pending
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "OrganizationInvitations_OrganizationAndEmail_UniqueKey" UNIQUE ("OrganizationUUID", "Email"),
    CONSTRAINT "OrganizationInvitations_Status_Check" CHECK ("Status" IN ('Pending', 'Accepted', 'Declined', 'Revoked'))
);
