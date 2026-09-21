--
-- The invitations waiting for the caller to answer, matched to them by the
-- email address on their account. The invitee's view, and the counterpart of
-- dbo.GetOrganizationInvitations.
--
-- Pending only, unexpired only, enabled organizations only: this is a list of
-- things the user can still act on, so anything dbo.AcceptOrganizationInvitation
-- would refuse does not belong in it. A user whose account carries no email
-- address matches nothing.
--
CREATE FUNCTION "dbo"."GetUserInvitations" (_LoginName varchar(64)) RETURNS TABLE(
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
    BEGIN
        SELECT lower(btrim("Users"."Email")) INTO _ActorEmail
        FROM "dbo"."Users"
        WHERE "Users"."LoginName" = _LoginName AND "Users"."IsEnabled" = true;

        IF _ActorEmail IS NULL OR _ActorEmail = '' THEN
            RETURN;
        END IF;

        RETURN QUERY
        SELECT "Invitation".*
        FROM
            "dbo"."OrganizationInvitations"
            JOIN "dbo"."Organizations" ON ("Organizations"."OrganizationUUID" = "OrganizationInvitations"."OrganizationUUID")
            CROSS JOIN LATERAL "dbo"."GetInvitation"("OrganizationInvitations"."InvitationUUID") AS "Invitation"
        WHERE
            "OrganizationInvitations"."Email" = _ActorEmail AND
            "OrganizationInvitations"."Status" = 'Pending' AND
            "OrganizationInvitations"."ExpiresAt" > CURRENT_TIMESTAMP AND
            "Organizations"."IsEnabled" = true
        ORDER BY
            "OrganizationInvitations"."CreatedAt" DESC,
            "Organizations"."Name" ASC;
    END;
$$ LANGUAGE plpgsql;
