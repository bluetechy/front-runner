--
-- Reading an account's address list: what comes back, in what order, and what
-- must never come back.
--

CREATE FUNCTION "test"."TestGetUserEmails_ReturnsEveryAddressOnTheAccount" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''member'')',
        4,
        'GetUserEmails did not return the member''s four addresses'
    );
    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''owner'')',
        1,
        'GetUserEmails did not return the owner''s one address'
    );
END;
$$ LANGUAGE plpgsql;

-- One account's addresses, and nobody else's. The member and the owner both
-- have rows, so a missing WHERE would show up here rather than in production.
CREATE FUNCTION "test"."TestGetUserEmails_ReturnsNobodyElsesAddresses" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''owner'') WHERE "Email" LIKE ''%marcus%''',
        0,
        'the owner''s list held one of the member''s addresses'
    );
END;
$$ LANGUAGE plpgsql;

-- "IsVerified" is the derived half of "VerifiedAt" and the two have to agree,
-- because the page reads the first and a sentence about when reads the second.
CREATE FUNCTION "test"."TestGetUserEmails_DerivesVerifiedFromTheTimestamp" () RETURNS void AS $$
DECLARE
    _Verified record;
    _Unverified record;
BEGIN
    SELECT * INTO _Verified FROM "dbo"."GetUserEmails"('member')
    WHERE "UserEmailUUID" = "test"."Fixture"('UserEmail.MemberWork');

    SELECT * INTO _Unverified FROM "dbo"."GetUserEmails"('member')
    WHERE "UserEmailUUID" = "test"."Fixture"('UserEmail.MemberFresh');

    PERFORM "test"."AssertTrue"(_Verified."IsVerified", 'a verified address did not read as verified');
    PERFORM "test"."AssertTrue"(_Verified."VerifiedAt" IS NOT NULL, 'a verified address came back with no timestamp');
    PERFORM "test"."AssertFalse"(_Unverified."IsVerified", 'an unverified address read as verified');
    PERFORM "test"."AssertTrue"(_Unverified."VerifiedAt" IS NULL, 'an unverified address came back with a timestamp');
END;
$$ LANGUAGE plpgsql;

-- Exactly one primary, and it is the address the account signs in with.
CREATE FUNCTION "test"."TestGetUserEmails_MarksExactlyOnePrimary" () RETURNS void AS $$
DECLARE
    _Primary record;
BEGIN
    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''member'') WHERE "IsPrimary"',
        1,
        'the member''s list did not hold exactly one primary address'
    );

    SELECT * INTO _Primary FROM "dbo"."GetUserEmails"('member') WHERE "IsPrimary";

    PERFORM "test"."AssertEquals"(
        _Primary."Email"::text,
        (SELECT "Users"."Email"::text FROM "dbo"."Users" WHERE "Users"."LoginName" = 'member'),
        'the primary address and dbo.Users."Email" disagreed'
    );
END;
$$ LANGUAGE plpgsql;

-- Oldest first, the way dbo.GetPaymentMethods orders a wallet: marking an
-- address primary must not move it. This is the assertion that fails if
-- somebody "helpfully" sorts the primary to the top.
CREATE FUNCTION "test"."TestGetUserEmails_OrdersOldestFirstAndLeavesThePrimaryWhereItIs" () RETURNS void AS $$
DECLARE
    _First uuid;
    _Order uuid[];
BEGIN
    SELECT array_agg("UserEmailUUID" ORDER BY "CreatedAt", "UserEmailUUID") INTO _Order
    FROM "dbo"."GetUserEmails"('member');

    SELECT "UserEmailUUID" INTO _First FROM "dbo"."GetUserEmails"('member') LIMIT 1;

    PERFORM "test"."AssertEquals"(_First, _Order[1], 'GetUserEmails did not come back oldest first');

    -- Promote the newest verified address and read the list again. The order
    -- must not have changed.
    PERFORM "dbo"."SetPrimaryUserEmail"('member', "test"."Fixture"('UserEmail.MemberWork'));

    SELECT "UserEmailUUID" INTO _First FROM "dbo"."GetUserEmails"('member') LIMIT 1;

    PERFORM "test"."AssertEquals"(_First, _Order[1], 'choosing a primary address reordered the list');
END;
$$ LANGUAGE plpgsql;

-- The token is the secret from a verification link and a list of addresses is
-- read by a browser. It must not be among the columns at all.
CREATE FUNCTION "test"."TestGetUserEmails_NeverReturnsTheVerificationToken" () RETURNS void AS $$
DECLARE
    _Columns text;
BEGIN
    SELECT string_agg("Columns"."Name", ', ') INTO _Columns
    FROM (
        SELECT "pg_attribute"."attname"::text AS "Name"
        FROM pg_proc
            JOIN pg_namespace ON ("pg_namespace"."oid" = "pg_proc"."pronamespace")
            JOIN pg_type ON ("pg_type"."oid" = "pg_proc"."prorettype")
            JOIN pg_attribute ON ("pg_attribute"."attrelid" = "pg_type"."typrelid")
        WHERE "pg_namespace"."nspname" = 'dbo'
            AND "pg_proc"."proname" = 'GetUserEmails'
            AND "pg_attribute"."attnum" > 0
    ) AS "Columns"
    WHERE "Columns"."Name" ILIKE '%token%';

    PERFORM "test"."AssertEquals"(_Columns, NULL::text, 'GetUserEmails returns a verification token');
END;
$$ LANGUAGE plpgsql;

-- An account nobody has heard of gets an empty list rather than an error,
-- matching dbo.GetPaymentMethods: there is nothing secret in "no rows".
CREATE FUNCTION "test"."TestGetUserEmails_AnswersAnUnknownAccountWithNothing" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''nobody'')',
        0,
        'an unknown account got a list of addresses'
    );
END;
$$ LANGUAGE plpgsql;

-- Disabled is the fixture account with no rows in this table: the shape of
-- every account that has not signed in since dbo.UserEmails existed.
CREATE FUNCTION "test"."TestGetUserEmails_AnswersAnAccountWithNoRowsWithNothing" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''disabled'')',
        0,
        'an account that predates the table did not get an empty list'
    );
END;
$$ LANGUAGE plpgsql;
