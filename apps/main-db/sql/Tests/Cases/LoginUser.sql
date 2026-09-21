CREATE FUNCTION "test"."TestLoginUser_ReturnsTheExistingUser" () RETURNS void AS $$
DECLARE
    _User record;
    _Before bigint;
    _After bigint;
BEGIN
    SELECT count(*) INTO _Before FROM "dbo"."Users";
    SELECT * INTO _User FROM "dbo"."LoginUser"('member');
    SELECT count(*) INTO _After FROM "dbo"."Users";

    PERFORM "test"."AssertEquals"(_User."UserUUID", "test"."Fixture"('User.Member'), 'LoginUser returned the wrong user');
    PERFORM "test"."AssertEquals"(_After, _Before, 'LoginUser created a duplicate account for an existing login');
END;
$$ LANGUAGE plpgsql;

-- KNOWN ISSUE: LoginUser upserts, so any unknown login silently becomes an
-- enabled account. There is no password or token check anywhere in the
-- function. Locked in as-is; replace when authentication arrives.
CREATE FUNCTION "test"."TestLoginUser_CreatesAnAccountForAnUnknownLogin_KnownIssue" () RETURNS void AS $$
DECLARE
    _User record;
    _Before bigint;
    _After bigint;
BEGIN
    SELECT count(*) INTO _Before FROM "dbo"."Users";
    SELECT * INTO _User FROM "dbo"."LoginUser"('stranger');
    SELECT count(*) INTO _After FROM "dbo"."Users";

    PERFORM "test"."AssertEquals"(_After, _Before + 1, 'LoginUser no longer auto-creates accounts -- replace this test');
    PERFORM "test"."AssertEquals"(_User."LoginName"::text, 'stranger', 'LoginUser returned the wrong account');
END;
$$ LANGUAGE plpgsql;
