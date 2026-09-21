--
-- Remove a membership. Two callers in one function: a user removing
-- themselves, and an owner removing somebody else.
--
-- An organization cannot be left without an owner. Removing the last enabled
-- owner is refused whichever of the two callers asks, because the result is an
-- organization nobody can administer -- no invitations, no teams, no way back
-- in. Hand ownership over first with dbo.SetOrganizationRole, which refuses the
-- mirror image of this for the same reason.
--
CREATE FUNCTION "dbo"."LeaveOrganization" (_LoginName varchar(64), _OrganizationUUID uuid, _UserUUID uuid) RETURNS TABLE(
    "OrganizationUUID" uuid,
    "Name" varchar(64),
    "TeamCount" integer,
    "UserCount" integer,
    "OwnerCount" integer,
    "IsOwner" boolean,
    "IsEnabled" boolean
) AS $$
    DECLARE
        _ActorUUID uuid = "dbo"."GetUserUUID"(_LoginName);
        _IsOwnerOfOrganization boolean = "dbo"."IsOwnerOfOrganization"(_LoginName, _OrganizationUUID);
    BEGIN
        IF NOT _IsOwnerOfOrganization AND _ActorUUID != _UserUUID THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        IF "dbo"."IsLastOwnerOfOrganization"(_OrganizationUUID, _UserUUID) THEN
            RAISE EXCEPTION 'The last owner cannot leave the organization.';
        END IF;

        DELETE FROM "dbo"."UserOrganizations" WHERE "UserOrganizations"."OrganizationUUID" = _OrganizationUUID AND "UserOrganizations"."UserUUID" = _UserUUID;
        RETURN QUERY
        SELECT
            "Organizations"."OrganizationUUID",
            "Organizations"."Name",
            CAST((SELECT COUNT("Teams"."TeamUUID") FROM "dbo"."Teams" WHERE "Teams"."OrganizationUUID" = "Organizations"."OrganizationUUID" AND "Teams"."IsEnabled" = true) AS INTEGER),
            CAST((SELECT COUNT("Users"."UserUUID") FROM "dbo"."UserOrganizations" LEFT JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID") WHERE "UserOrganizations"."OrganizationUUID" = "Organizations"."OrganizationUUID" AND "Users"."IsEnabled" = true) AS INTEGER),
            CAST((SELECT COUNT("Users"."UserUUID") FROM "dbo"."UserOrganizations" LEFT JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID") WHERE "UserOrganizations"."OrganizationUUID" = "Organizations"."OrganizationUUID" AND "Users"."IsEnabled" = true AND "UserOrganizations"."IsOwner" = true) AS INTEGER),
            false,
            COALESCE("Organizations"."IsEnabled", false)
        FROM
            "dbo"."Organizations"
        WHERE
            "Organizations"."OrganizationUUID" = _OrganizationUUID
        LIMIT 1;
    END;
$$ LANGUAGE plpgsql;
