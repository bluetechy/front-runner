--
-- Turn an invitation down. The invitee's side of
-- dbo.RevokeOrganizationInvitation, matched to the caller the same way
-- dbo.AcceptOrganizationInvitation matches them.
--
-- The row stays, as Declined. An owner can see the answer, and can invite the
-- address again -- dbo.InviteToOrganization moves this row back to Pending.
--
CREATE FUNCTION "dbo"."DeclineOrganizationInvitation" (_LoginName varchar(64), _InvitationUUID uuid) RETURNS TABLE(
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
        _ActorEmail varchar(255);
        _Status varchar(16);
    BEGIN
        SELECT lower(btrim("Users"."Email")) INTO _ActorEmail
        FROM "dbo"."Users"
        WHERE "Users"."LoginName" = _LoginName AND "Users"."IsEnabled" = true;

        SELECT "OrganizationInvitations"."Status" INTO _Status
        FROM "dbo"."OrganizationInvitations"
        WHERE "OrganizationInvitations"."InvitationUUID" = _InvitationUUID
            AND "OrganizationInvitations"."Email" = _ActorEmail;

        IF _ActorEmail IS NULL OR _ActorEmail = '' OR _Status IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;
        IF _Status <> 'Pending' THEN
            RAISE EXCEPTION 'That invitation has already been answered.';
        END IF;

        UPDATE "dbo"."OrganizationInvitations" SET
            "Status" = 'Declined',
            "RespondedAt" = CURRENT_TIMESTAMP,
            "UpdatedBy" = _LoginName
        WHERE "OrganizationInvitations"."InvitationUUID" = _InvitationUUID;

        RETURN QUERY SELECT * FROM "dbo"."GetInvitation"(_InvitationUUID);
    END;
$$ LANGUAGE plpgsql;
