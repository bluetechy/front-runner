--
-- Promote a member to owner, or demote an owner back to a member. Owners only.
--
-- This is what makes ownership transferable. Without it the only route to
-- becoming an owner is dbo.InviteToOrganization offering the seat up front, so
-- an owner who wanted to hand over to somebody already inside would have to
-- remove them and invite them back -- and dbo.LeaveOrganization would refuse
-- to let the last owner leave in the meantime. The guard is a trap without a
-- way out of it, and this is the way out.
--
-- Demoting the last owner is refused for the same reason leaving is: an
-- organization with no owner has nobody who can undo it. Promote the successor
-- first; an owner demoting themselves once somebody else holds the seat is
-- fine, and is the normal handover.
--
-- The target has to be an enabled member already. Ownership is a property of a
-- membership, not a way to create one -- that is what an invitation is for.
--
CREATE FUNCTION "dbo"."SetOrganizationRole" (_LoginName varchar(64), _OrganizationUUID uuid, _UserUUID uuid, _IsOwner boolean) RETURNS TABLE(
    "UserUUID" uuid,
    "Name" varchar(64),
    "LoginName" varchar(64),
    "Email" varchar(255),
    "IsOwner" boolean,
    "JoinedAt" TIMESTAMPTZ
) AS $$
    BEGIN
        IF NOT "dbo"."IsOwnerOfOrganization"(_LoginName, _OrganizationUUID) THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM "dbo"."UserOrganizations"
                JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID")
            WHERE "UserOrganizations"."OrganizationUUID" = _OrganizationUUID
                AND "UserOrganizations"."UserUUID" = _UserUUID
                AND "Users"."IsEnabled" = true
        ) THEN
            RAISE EXCEPTION 'That user does not belong to the organization.';
        END IF;

        IF _IsOwner = false AND "dbo"."IsLastOwnerOfOrganization"(_OrganizationUUID, _UserUUID) THEN
            RAISE EXCEPTION 'The last owner cannot be demoted.';
        END IF;

        UPDATE "dbo"."UserOrganizations" SET
            "IsOwner" = _IsOwner,
            "UpdatedBy" = _LoginName
        WHERE "UserOrganizations"."OrganizationUUID" = _OrganizationUUID
            AND "UserOrganizations"."UserUUID" = _UserUUID;

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
            "UserOrganizations"."UserUUID" = _UserUUID;
    END;
$$ LANGUAGE plpgsql;
