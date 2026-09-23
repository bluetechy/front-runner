--
-- Choosing which address an account signs in with. This is the only function
-- here that changes a login, so most of these are about what it refuses.
--

CREATE FUNCTION "test"."TestSetPrimaryUserEmail_MovesThePrimaryToAVerifiedAddress" () RETURNS void AS $$
DECLARE
    _Primary record;
BEGIN
    PERFORM "dbo"."SetPrimaryUserEmail"('member', "test"."Fixture"('UserEmail.MemberWork'));

    SELECT * INTO _Primary FROM "dbo"."GetUserEmails"('member') WHERE "IsPrimary";

    PERFORM "test"."AssertEquals"(_Primary."UserEmailUUID", "test"."Fixture"('UserEmail.MemberWork'), 'the chosen address did not become primary');
    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''member'') WHERE "IsPrimary"',
        1,
        'the account was left with the wrong number of primary addresses'
    );
END;
$$ LANGUAGE plpgsql;

-- dbo.Users."Email" is the copy everything older than this table reads: the
-- members list, the invitation match, the token comparison in the API's guard.
-- A primary set here and a column left behind would have them disagree.
CREATE FUNCTION "test"."TestSetPrimaryUserEmail_WritesTheAddressOntoTheAccount" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."SetPrimaryUserEmail"('member', "test"."Fixture"('UserEmail.MemberWork'));

    PERFORM "test"."AssertEquals"(
        (SELECT "Users"."Email"::text FROM "dbo"."Users" WHERE "Users"."LoginName" = 'member'),
        'marcus.work@example.test',
        'dbo.Users."Email" did not follow the new primary address'
    );
END;
$$ LANGUAGE plpgsql;

-- The rule the whole feature rests on. An unverified address is one nobody has
-- proved they can read, and making it a login would hand the account to
-- whoever does read it.
CREATE FUNCTION "test"."TestSetPrimaryUserEmail_RefusesAnUnverifiedAddress" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."SetPrimaryUserEmail"(%L, %L)', 'member', "test"."Fixture"('UserEmail.MemberFresh')),
        'an unverified address became the sign-in address',
        'has to be verified'
    );

    PERFORM "test"."AssertEquals"(
        (SELECT "Users"."Email"::text FROM "dbo"."Users" WHERE "Users"."LoginName" = 'member'),
        'member@example.test',
        'a refused change still moved dbo.Users."Email"'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSetPrimaryUserEmail_RefusesSomebodyElsesAddress" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."SetPrimaryUserEmail"(%L, %L)', 'owner', "test"."Fixture"('UserEmail.MemberWork')),
        'one account made another account''s address its own',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

-- An address that does not exist and one belonging to somebody else get the
-- same answer, so the refusal does not confirm that a row is there.
CREATE FUNCTION "test"."TestSetPrimaryUserEmail_RefusesAnUnknownAddress" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."SetPrimaryUserEmail"(%L, %L)', 'member', '00000000-0000-4000-8000-000000000000'),
        'an address that does not exist was accepted',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

-- Choosing the address that already has it is not an error, and must not end
-- with the flag cleared: clear-then-set on one row has to leave it set.
CREATE FUNCTION "test"."TestSetPrimaryUserEmail_ToleratesChoosingTheCurrentPrimary" () RETURNS void AS $$
DECLARE
    _Primary record;
BEGIN
    PERFORM "dbo"."SetPrimaryUserEmail"('member', "test"."Fixture"('UserEmail.MemberPrimary'));

    SELECT * INTO _Primary FROM "dbo"."GetUserEmails"('member') WHERE "IsPrimary";

    PERFORM "test"."AssertEquals"(_Primary."UserEmailUUID", "test"."Fixture"('UserEmail.MemberPrimary'), 'choosing the current primary cleared it');
    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''member'') WHERE "IsPrimary"',
        1,
        'choosing the current primary left the wrong number of primaries'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSetPrimaryUserEmail_AnswersWithTheWholeList" () RETURNS void AS $$
DECLARE
    _Rows bigint;
BEGIN
    SELECT count(*) INTO _Rows
    FROM "dbo"."SetPrimaryUserEmail"('member', "test"."Fixture"('UserEmail.MemberWork')) AS "Addresses";

    PERFORM "test"."AssertEquals"(_Rows, 4::bigint, 'SetPrimaryUserEmail did not answer with the whole list');
END;
$$ LANGUAGE plpgsql;
