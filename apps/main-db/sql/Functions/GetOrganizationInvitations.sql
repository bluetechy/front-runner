--
-- Every invitation an organization has issued, answered or not. The owner's
-- view: it is how they see who has been asked, who has not replied, and who
-- said no, so it deliberately does not filter by status the way
-- dbo.GetUserInvitations does.
--
-- Owners only. Non-owners get an exception rather than an empty list, because
-- an empty list would read as "nobody has been invited".
--
CREATE FUNCTION "dbo"."GetOrganizationInvitations" (_LoginName varchar(64), _OrganizationUUID uuid) RETURNS TABLE(
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
        IF NOT "dbo"."IsOwnerOfOrganization"(_LoginName, _OrganizationUUID) THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        RETURN QUERY
        SELECT "Invitation".*
        FROM
            "dbo"."OrganizationInvitations"
            CROSS JOIN LATERAL "dbo"."GetInvitation"("OrganizationInvitations"."InvitationUUID") AS "Invitation"
        WHERE
            "OrganizationInvitations"."OrganizationUUID" = _OrganizationUUID
        ORDER BY
            "OrganizationInvitations"."CreatedAt" DESC,
            "OrganizationInvitations"."Email" ASC;
    END;
$$ LANGUAGE plpgsql;
