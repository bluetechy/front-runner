--
-- The draft file called UserRoles defined roles and assigned none. dbo.Roles
-- is that definition; this is the assignment that makes it mean something.
--
-- Nothing reads either. The live functions authorize on organization and team
-- membership and on the boolean flags -- see SCHEMA-NOTES.md.
--

CREATE FUNCTION "test"."TestUserRoles_ListTheRolesAUserHolds" () RETURNS void AS $$
DECLARE
    _Names text;
BEGIN
    SELECT string_agg("Roles"."Name", ', ' ORDER BY "Roles"."Name") INTO _Names
    FROM "dbo"."UserRoles"
        JOIN "dbo"."Roles" ON ("Roles"."RoleUUID" = "UserRoles"."RoleUUID")
    WHERE "UserRoles"."UserUUID" = "test"."Fixture"('User.Member');

    PERFORM "test"."AssertEquals"(_Names, 'Lead, Reviewer', 'the member holds both roles');
END;
$$ LANGUAGE plpgsql;

-- The role carries the organization, so a role assignment reaches its
-- organization through dbo.Roles rather than repeating it.
CREATE FUNCTION "test"."TestUserRoles_ReachTheOrganizationThroughTheRole" () RETURNS void AS $$
DECLARE
    _OrganizationUUID uuid;
BEGIN
    SELECT "Roles"."OrganizationUUID" INTO _OrganizationUUID
    FROM "dbo"."UserRoles"
        JOIN "dbo"."Roles" ON ("Roles"."RoleUUID" = "UserRoles"."RoleUUID")
    WHERE "UserRoles"."UserUUID" = "test"."Fixture"('User.Member')
        AND "Roles"."Name" = 'Lead';
    PERFORM "test"."AssertEquals"(_OrganizationUUID, "test"."Fixture"('Organization.Acme'), 'the role should carry the organization');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestUserRoles_RejectTheSameRoleTwice" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."UserRoles" ("UserUUID", "RoleUUID", "CreatedBy") VALUES (%L, %L, ''test'')',
            "test"."Fixture"('User.Member'), "test"."Fixture"('Role.Lead')
        ),
        'UserRoles accepted the same role twice for one user'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestRoles_AllowTheSameNameInAnotherOrganization" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    INSERT INTO "dbo"."Roles" ("OrganizationUUID", "Name", "CreatedBy")
    VALUES ("test"."Fixture"('Organization.Disabled'), 'Lead', 'test');
    SELECT count(*) INTO _Count FROM "dbo"."Roles" WHERE "Name" = 'Lead';
    PERFORM "test"."AssertEquals"(_Count, 2::bigint, 'Lead should exist in both organizations');
END;
$$ LANGUAGE plpgsql;

-- An ACL grant does not make the task readable: no live function consults
-- dbo.AccessControlLists. The outsider below holds a Read grant and still
-- belongs to no organization.
CREATE FUNCTION "test"."TestAccessControlLists_AreNotConsultedByAnything" () RETURNS void AS $$
DECLARE
    _Granted bigint;
BEGIN
    SELECT count(*) INTO _Granted FROM "dbo"."AccessControlLists"
    WHERE "UserUUID" = "test"."Fixture"('User.Outsider') AND "TaskUUID" = "test"."Fixture"('Task.Build');
    PERFORM "test"."AssertEquals"(_Granted, 1::bigint, 'the outsider holds a Read grant on the task');

    PERFORM "test"."AssertFalse"(
        "dbo"."IsMemberOfOrganization"('outsider', "test"."Fixture"('Organization.Acme')),
        'the grant should not have made the outsider a member of anything'
    );
END;
$$ LANGUAGE plpgsql;
