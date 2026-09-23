CREATE FUNCTION "test"."TestGetUserUUID_ResolvesAKnownLogin" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertEquals"(
        "dbo"."GetUserUUID"('member'),
        "test"."Fixture"('User.Member'),
        'GetUserUUID did not resolve the member login'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetUserUUID_ReturnsNullForAnUnknownLogin" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertEquals"(
        "dbo"."GetUserUUID"('nobody'),
        NULL::uuid,
        'GetUserUUID returned something for a login that does not exist'
    );
END;
$$ LANGUAGE plpgsql;

-- GetUserUUID is a lookup, not an authorization check: the callers that care
-- about IsEnabled test it themselves.
CREATE FUNCTION "test"."TestGetUserUUID_ResolvesADisabledUser" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertEquals"(
        "dbo"."GetUserUUID"('disabled'),
        "test"."Fixture"('User.Disabled'),
        'GetUserUUID skipped a disabled user'
    );
END;
$$ LANGUAGE plpgsql;
