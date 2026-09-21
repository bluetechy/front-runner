--
-- One invitation in the shape every invitation function returns. It exists so
-- that the five of them agree on that shape by construction rather than by six
-- copies of the same join drifting apart.
--
-- No permission check: this is the projection, and each caller has already
-- decided whether the actor is allowed to see the row.
--
CREATE FUNCTION "dbo"."GetInvitation" (_InvitationUUID uuid) RETURNS TABLE(
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
    BEGIN
        RETURN QUERY
        SELECT
            "OrganizationInvitations"."InvitationUUID",
            "OrganizationInvitations"."OrganizationUUID",
            "Organizations"."Name",
            "OrganizationInvitations"."Email",
            "OrganizationInvitations"."IsOwner",
            "OrganizationInvitations"."Status",
            "OrganizationInvitations"."ExpiresAt",
            "OrganizationInvitations"."RespondedAt",
            "InvitedBy"."LoginName"
        FROM
            "dbo"."OrganizationInvitations"
            JOIN "dbo"."Organizations" ON ("Organizations"."OrganizationUUID" = "OrganizationInvitations"."OrganizationUUID")
            JOIN "dbo"."Users" AS "InvitedBy" ON ("InvitedBy"."UserUUID" = "OrganizationInvitations"."InvitedByUserUUID")
        WHERE
            "OrganizationInvitations"."InvitationUUID" = _InvitationUUID;
    END;
$$ LANGUAGE plpgsql;
