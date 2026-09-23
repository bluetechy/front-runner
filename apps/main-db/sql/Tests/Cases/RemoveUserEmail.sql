--
-- Taking an address off an account, and the one that cannot be taken off.
--

CREATE FUNCTION "test"."TestRemoveUserEmail_RemovesASecondaryAddress" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."RemoveUserEmail"('member', "test"."Fixture"('UserEmail.MemberWork'));

    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''member'')',
        3,
        'the address was not removed'
    );
    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''member'') WHERE "Email" = ''marcus.work@example.test''',
        0,
        'the removed address is still on the account'
    );
END;
$$ LANGUAGE plpgsql;

-- Removing the primary would leave an account whose login name resolves to
-- nothing an identity provider can mail, so it is refused and the message says
-- what to do instead.
CREATE FUNCTION "test"."TestRemoveUserEmail_RefusesThePrimaryAddress" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."RemoveUserEmail"(%L, %L)', 'member', "test"."Fixture"('UserEmail.MemberPrimary')),
        'the sign-in address was removed',
        'cannot be removed'
    );

    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''member'') WHERE "IsPrimary"',
        1,
        'a refused removal left the account without a primary address'
    );
END;
$$ LANGUAGE plpgsql;

-- Unlike the wallet, removing does not hand the mark to whatever is left:
-- there is nothing to hand it to, because the primary is the one row this
-- refuses to remove.
CREATE FUNCTION "test"."TestRemoveUserEmail_LeavesThePrimaryWhereItIs" () RETURNS void AS $$
DECLARE
    _Primary record;
BEGIN
    PERFORM "dbo"."RemoveUserEmail"('member', "test"."Fixture"('UserEmail.MemberWork'));

    SELECT * INTO _Primary FROM "dbo"."GetUserEmails"('member') WHERE "IsPrimary";

    PERFORM "test"."AssertEquals"(_Primary."UserEmailUUID", "test"."Fixture"('UserEmail.MemberPrimary'), 'removing an address moved the primary');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestRemoveUserEmail_RefusesSomebodyElsesAddress" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."RemoveUserEmail"(%L, %L)', 'owner', "test"."Fixture"('UserEmail.MemberWork')),
        'one account removed another account''s address',
        'Action cannot be performed.'
    );

    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''member'')',
        4,
        'a refused removal took the address anyway'
    );
END;
$$ LANGUAGE plpgsql;

-- An address that does not exist and one belonging to somebody else answer the
-- same way, so the refusal does not confirm that a row is there.
CREATE FUNCTION "test"."TestRemoveUserEmail_RefusesAnUnknownAddress" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."RemoveUserEmail"(%L, %L)', 'member', '00000000-0000-4000-8000-000000000000'),
        'an address that does not exist was removed',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

-- Removing an unverified address has to take its token with it, or a link
-- already in somebody's inbox would point at a row that is gone.
CREATE FUNCTION "test"."TestRemoveUserEmail_TakesTheVerificationTokenWithIt" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."RemoveUserEmail"('member', "test"."Fixture"('UserEmail.MemberFresh'));

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."VerifyUserEmail"(%L)', 'token-fresh'),
        'a link for a removed address still verified something',
        'not valid'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestRemoveUserEmail_AnswersWithTheWholeList" () RETURNS void AS $$
DECLARE
    _Rows bigint;
BEGIN
    SELECT count(*) INTO _Rows
    FROM "dbo"."RemoveUserEmail"('member', "test"."Fixture"('UserEmail.MemberWork')) AS "Addresses";

    PERFORM "test"."AssertEquals"(_Rows, 3::bigint, 'RemoveUserEmail did not answer with the whole list');
END;
$$ LANGUAGE plpgsql;
