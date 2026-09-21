CREATE FUNCTION "test"."TestGetUsers_ReturnsEveryEnabledUserForAdmin" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetUsers"('admin');
    PERFORM "test"."AssertEquals"(_Count, 4::bigint, 'GetUsers should return the four enabled fixture users');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetUsers_ExcludesDisabledUsers" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetUsers"('admin') AS "Users" WHERE "Users"."LoginName" = 'disabled';
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetUsers returned a disabled user');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetUsers_ReturnsNothingForANonAdminLogin" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetUsers"('member');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetUsers handed the full user list to a plain member');
END;
$$ LANGUAGE plpgsql;

-- KNOWN ISSUE: GetUsers authorises on the literal string 'admin' rather than
-- on Users.IsAdmin, so a genuine admin under any other login gets nothing --
-- and anyone who registers the login 'admin' gets everything. This test locks
-- in the behaviour as it stands; when GetUsers is fixed to check IsAdmin, it
-- should be replaced with its opposite.
CREATE FUNCTION "test"."TestGetUsers_IgnoresIsAdmin_KnownIssue" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    INSERT INTO "dbo"."Users" ("Name", "LoginName", "IsAdmin", "CreatedBy") VALUES ('Second Admin', 'admin2', true, 'test');
    SELECT count(*) INTO _Count FROM "dbo"."GetUsers"('admin2');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetUsers now honours IsAdmin -- replace this test with the positive case');
END;
$$ LANGUAGE plpgsql;
