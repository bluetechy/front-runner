--
-- Who is in an organization, and which of them own it. This is the list an
-- owner works from when deciding whom to promote or remove, and the one a
-- member reads to see who they are working with.
--
-- Any member can read it, not just an owner -- knowing who else is in the room
-- is not an administrative privilege. Compare dbo.GetOrganizationInvitations,
-- which is owner-only because a list of who has been *asked* is.
--
-- Disabled accounts are excluded, which keeps this consistent with the
-- "UserCount" that dbo.GetOrganizations reports: the two would otherwise
-- disagree about the same organization.
--
CREATE FUNCTION "dbo"."GetOrganizationMembers" (_LoginName varchar(64), _OrganizationUUID uuid) RETURNS TABLE(
    "UserUUID" uuid,
    "Name" varchar(64),
    "LoginName" varchar(64),
    "Email" varchar(255),
    "IsOwner" boolean,
    "JoinedAt" TIMESTAMPTZ
) AS $$
    BEGIN
        IF NOT "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID) THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        RETURN QUERY
        SELECT
            "Users"."UserUUID",
            "Users"."Name",
            "Users"."LoginName",
            "Users"."Email",
            "UserOrganizations"."IsOwner",
            "UserOrganizations"."CreatedAt"
        FROM
            "dbo"."UserOrganizations"
            JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID")
        WHERE
            "UserOrganizations"."OrganizationUUID" = _OrganizationUUID AND
            "Users"."IsEnabled" = true
        ORDER BY
            "UserOrganizations"."IsOwner" DESC,
            "Users"."Name" ASC,
            "Users"."UserUUID" ASC;
    END;
$$ LANGUAGE plpgsql;
