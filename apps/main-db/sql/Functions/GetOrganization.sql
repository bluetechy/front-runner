--
-- One organization, for the page that shows it on its own. The plural
-- dbo.GetOrganizations answers "where do I belong"; this answers "tell me
-- about this one", which is the call behind a detail view, a breadcrumb, or a
-- refresh after a mutation.
--
-- Membership is read straight from dbo.UserOrganizations rather than through
-- dbo.IsMemberOfOrganization, because that helper also requires the
-- organization to be enabled -- and an owner looking at an organization they
-- have archived, in order to restore it, is exactly the case this has to serve.
--
-- Returns no row rather than raising when the caller does not belong: asking
-- about an organization you are not in is a miss, not a violation, and raising
-- would confirm the organization exists.
--
CREATE FUNCTION "dbo"."GetOrganization" (_LoginName varchar(64), _OrganizationUUID uuid) RETURNS TABLE(
    "OrganizationUUID" uuid,
    "Name" varchar(64),
    "TeamCount" integer,
    "UserCount" integer,
    "OwnerCount" integer,
    "IsOwner" boolean,
    "IsEnabled" boolean
) AS $$
    DECLARE
        _UserUUID uuid = "dbo"."GetUserUUID"(_LoginName);
    BEGIN
        RETURN QUERY
        SELECT
            "Organizations"."OrganizationUUID",
            "Organizations"."Name",
            CAST((SELECT COUNT("Teams"."TeamUUID") FROM "dbo"."Teams" WHERE "Teams"."OrganizationUUID" = "Organizations"."OrganizationUUID" AND "Teams"."IsEnabled" = true) AS INTEGER),
            CAST((SELECT COUNT("Users"."UserUUID") FROM "dbo"."UserOrganizations" LEFT JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID") WHERE "UserOrganizations"."OrganizationUUID" = "Organizations"."OrganizationUUID" AND "Users"."IsEnabled" = true) AS INTEGER),
            CAST((SELECT COUNT("Users"."UserUUID") FROM "dbo"."UserOrganizations" LEFT JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID") WHERE "UserOrganizations"."OrganizationUUID" = "Organizations"."OrganizationUUID" AND "Users"."IsEnabled" = true AND "UserOrganizations"."IsOwner" = true) AS INTEGER),
            "Membership"."IsOwner",
            COALESCE("Organizations"."IsEnabled", false)
        FROM
            "dbo"."Organizations"
            JOIN "dbo"."UserOrganizations" AS "Membership" ON ("Membership"."OrganizationUUID" = "Organizations"."OrganizationUUID")
            JOIN "dbo"."Users" ON ("Users"."UserUUID" = "Membership"."UserUUID")
        WHERE
            "Organizations"."OrganizationUUID" = _OrganizationUUID AND
            "Membership"."UserUUID" = _UserUUID AND
            "Users"."IsEnabled" = true
        LIMIT 1;
    END;
$$ LANGUAGE plpgsql;
