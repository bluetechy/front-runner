--
-- Putting another address on an account: what is normalized, what is refused,
-- and the one thing adding an address must never do.
--

CREATE FUNCTION "test"."TestAddUserEmail_AddsAnUnverifiedAddress" () RETURNS void AS $$
DECLARE
    _Added record;
BEGIN
    PERFORM "dbo"."AddUserEmail"('owner', 'olivia.second@example.test', 'token-one');

    SELECT * INTO _Added FROM "dbo"."GetUserEmails"('owner')
    WHERE "Email" = 'olivia.second@example.test';

    PERFORM "test"."AssertTrue"(_Added."UserEmailUUID" IS NOT NULL, 'the address was not added');
    PERFORM "test"."AssertFalse"(_Added."IsVerified", 'a newly added address arrived verified');
    PERFORM "test"."AssertTrue"(_Added."VerifiedAt" IS NULL, 'a newly added address carried a verification timestamp');
END;
$$ LANGUAGE plpgsql;

-- The invariant that matters most here: adding an address is not a way to
-- change which one somebody signs in with. That is dbo.SetPrimaryUserEmail,
-- and it refuses an unverified address.
CREATE FUNCTION "test"."TestAddUserEmail_NeverChangesTheLogin" () RETURNS void AS $$
DECLARE
    _Primary record;
    _Login varchar(255);
BEGIN
    SELECT "Users"."Email" INTO _Login FROM "dbo"."Users" WHERE "Users"."LoginName" = 'owner';

    PERFORM "dbo"."AddUserEmail"('owner', 'olivia.second@example.test', 'token-one');

    SELECT * INTO _Primary FROM "dbo"."GetUserEmails"('owner') WHERE "IsPrimary";

    PERFORM "test"."AssertEquals"(_Primary."Email"::text, 'owner@example.test', 'adding an address moved the primary');
    PERFORM "test"."AssertEquals"(
        (SELECT "Users"."Email"::text FROM "dbo"."Users" WHERE "Users"."LoginName" = 'owner'),
        _Login::text,
        'adding an address changed dbo.Users."Email"'
    );
    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''owner'') WHERE "IsPrimary"',
        1,
        'adding an address left the account with the wrong number of primaries'
    );
END;
$$ LANGUAGE plpgsql;

-- Folded and trimmed on the way in, which is what dbo.UserEmails."Email"
-- requires and what makes its unique key mean anything.
CREATE FUNCTION "test"."TestAddUserEmail_FoldsAndTrimsTheAddress" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."AddUserEmail"('owner', '  Olivia.Second@Example.TEST  ', 'token-one');

    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''owner'') WHERE "Email" = ''olivia.second@example.test''',
        1,
        'the address was not folded to lower case and trimmed'
    );
END;
$$ LANGUAGE plpgsql;

-- One address, one account. The message says nothing about whose it is,
-- because "that one is taken" and "that one is already yours" are different
-- facts and only one of them is the caller's to know.
CREATE FUNCTION "test"."TestAddUserEmail_RefusesAnAddressAlreadyOnAnyAccount" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."AddUserEmail"(%L, %L, %L)', 'owner', 'owner@example.test', 'token-one'),
        'an account added an address it already held',
        'already on an account'
    );

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."AddUserEmail"(%L, %L, %L)', 'owner', 'member@example.test', 'token-one'),
        'an account added an address belonging to somebody else',
        'already on an account'
    );

    -- Folding happens before the check, or the same address in a different
    -- case would get past it and be refused by the unique key instead.
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."AddUserEmail"(%L, %L, %L)', 'owner', 'OWNER@EXAMPLE.TEST', 'token-one'),
        'an address already held was accepted in a different case',
        'already on an account'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAddUserEmail_RefusesSomethingThatIsNotAnAddress" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."AddUserEmail"(%L, %L, %L)', 'owner', '', 'token-one'),
        'an empty address was accepted',
        'email address is required'
    );

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."AddUserEmail"(%L, %L, %L)', 'owner', 'olivia', 'token-one'),
        'an address with no @ was accepted',
        'email address is required'
    );

    -- An "@" that is the first character leaves no local part before it.
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."AddUserEmail"(%L, %L, %L)', 'owner', '@example.test', 'token-one'),
        'an address with nothing before the @ was accepted',
        'email address is required'
    );
END;
$$ LANGUAGE plpgsql;

-- An unverified row with no token is an address that can never become
-- verified, so the token is required rather than optional.
CREATE FUNCTION "test"."TestAddUserEmail_RequiresAVerificationToken" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."AddUserEmail"(%L, %L, NULL)', 'owner', 'olivia.second@example.test'),
        'an address was added with no verification token',
        'verification token is required'
    );

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."AddUserEmail"(%L, %L, %L)', 'owner', 'olivia.second@example.test', '   '),
        'an address was added with a blank verification token',
        'verification token is required'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAddUserEmail_RefusesAnUnknownAccount" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."AddUserEmail"(%L, %L, %L)', 'nobody', 'nobody.else@example.test', 'token-one'),
        'an unknown account added an address',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

-- The ceiling, so a list the page draws as a table stays one.
CREATE FUNCTION "test"."TestAddUserEmail_StopsAtTenAddresses" () RETURNS void AS $$
DECLARE
    _Index integer;
BEGIN
    -- The owner starts with one, so nine more fill the account.
    FOR _Index IN 1..9 LOOP
        PERFORM "dbo"."AddUserEmail"('owner', format('olivia%s@example.test', _Index), format('token-%s', _Index));
    END LOOP;

    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''owner'')',
        10,
        'the account did not reach ten addresses'
    );

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."AddUserEmail"(%L, %L, %L)', 'owner', 'olivia10@example.test', 'token-10'),
        'an eleventh address was accepted',
        'ten email addresses'
    );
END;
$$ LANGUAGE plpgsql;

-- Like the wallet's writes, this answers with the whole list rather than the
-- row it wrote: the caller is drawing a table.
CREATE FUNCTION "test"."TestAddUserEmail_AnswersWithTheWholeList" () RETURNS void AS $$
DECLARE
    _Rows bigint;
BEGIN
    SELECT count(*) INTO _Rows
    FROM "dbo"."AddUserEmail"('owner', 'olivia.second@example.test', 'token-one') AS "Addresses";

    PERFORM "test"."AssertEquals"(_Rows, 2::bigint, 'AddUserEmail did not answer with the whole list');
END;
$$ LANGUAGE plpgsql;
