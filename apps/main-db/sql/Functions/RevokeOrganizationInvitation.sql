--
-- Withdraw an invitation before it is answered. Owners only, and only while
-- the invitation is still Pending -- withdrawing an accepted invitation would
-- suggest the membership went with it, and it does not.
--
-- Removing a member who has already accepted is dbo.LeaveOrganization.
--
CREATE FUNCTION "dbo"."RevokeOrganizationInvitation" (_LoginName varchar(64), _InvitationUUID uuid) RETURNS TABLE(
    "InvitationUUID" uuid,
    "OrganizationUUID" uuid,
    "OrganizationName" varchar(64),
    "Email" varchar(255),
    "IsOwner" boolean,
    "Status" varchar(16),
    "ExpiresAt" TIMESTAMPTZ,
    "RespondedAt" TIMESTAMPTZ,
    "InvitedByLoginName" varchar(64)
) AS $$
    DECLARE
        _OrganizationUUID uuid;
        _Status varchar(16);
    BEGIN
        SELECT
            "OrganizationInvitations"."OrganizationUUID",
            "OrganizationInvitations"."Status"
        INTO _OrganizationUUID, _Status
        FROM "dbo"."OrganizationInvitations"
        WHERE "OrganizationInvitations"."InvitationUUID" = _InvitationUUID;

        IF _OrganizationUUID IS NULL OR NOT "dbo"."IsOwnerOfOrganization"(_LoginName, _OrganizationUUID) THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;
        IF _Status <> 'Pending' THEN
            RAISE EXCEPTION 'That invitation has already been answered.';
        END IF;

        UPDATE "dbo"."OrganizationInvitations" SET
            "Status" = 'Revoked',
            "RespondedAt" = CURRENT_TIMESTAMP,
            "UpdatedBy" = _LoginName
        WHERE "OrganizationInvitations"."InvitationUUID" = _InvitationUUID;

        RETURN QUERY SELECT * FROM "dbo"."GetInvitation"(_InvitationUUID);
    END;
$$ LANGUAGE plpgsql;
