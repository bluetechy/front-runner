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
-- An address is withheld from this list when its owner has turned on the
-- security page's privacy switch. They stay in the list under their name and
-- login name: the point of the switch is not to be invisible to the people
-- they work with, it is not to hand every one of them a mailbox. The row is
-- returned with an empty "Email", which is the same thing this column already
-- says for an account that has never had an address.
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
            -- Withheld when its owner has asked for that on the security
            -- page. Empty rather than NULL, because dbo.Users."Email" is
            -- NOT NULL DEFAULT '' and an account that has never had an
            -- address already reads as '' here: one representation, so no
            -- caller has to handle two. See dbo.SetUserEmailPrivacy.
            CASE WHEN COALESCE("UserProfiles"."EmailIsPrivate", false)
                THEN ''::varchar(255)
                ELSE "Users"."Email"
            END,
            "UserOrganizations"."IsOwner",
            "UserOrganizations"."CreatedAt"
        FROM
            "dbo"."UserOrganizations"
            JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID")
            LEFT JOIN "dbo"."UserProfiles" ON ("UserProfiles"."UserUUID" = "Users"."UserUUID")
        WHERE
            "UserOrganizations"."OrganizationUUID" = _OrganizationUUID AND
            "Users"."IsEnabled" = true
        ORDER BY
            "UserOrganizations"."IsOwner" DESC,
            "Users"."Name" ASC,
            "Users"."UserUUID" ASC;
    END;
$$ LANGUAGE plpgsql;
