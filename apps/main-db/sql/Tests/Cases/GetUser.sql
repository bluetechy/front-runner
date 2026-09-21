CREATE FUNCTION "test"."TestGetUser_ReturnsTheMatchingUser" () RETURNS void AS $$
DECLARE
    _User record;
BEGIN
    SELECT * INTO _User FROM "dbo"."GetUser"('member');
    PERFORM "test"."AssertEquals"(_User."UserUUID", "test"."Fixture"('User.Member'), 'GetUser returned the wrong user');
    PERFORM "test"."AssertEquals"(_User."Name"::text, 'Marcus Member', 'GetUser returned the wrong name');
    PERFORM "test"."AssertEquals"(_User."Email"::text, 'member@example.test', 'GetUser returned the wrong email');
    PERFORM "test"."AssertFalse"(_User."IsAdmin", 'GetUser reported a plain member as an admin');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetUser_ReturnsNothingForAnUnknownLogin" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetUser"('nobody');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetUser returned a row for a login that does not exist');
END;
$$ LANGUAGE plpgsql;
