--
-- Spending a password reset token. The token is the whole of the
-- authorization, so what these hold is that it works exactly once, that it
-- stops working after an hour, and that a wrong one gives nothing away.
--

CREATE FUNCTION "test"."TestSpendPasswordReset_SaysWhoseAccountItIs" () RETURNS void AS $$
DECLARE
    _Spent record;
BEGIN
    SELECT * INTO _Spent FROM "dbo"."SpendPasswordReset"('reset-fresh');

    PERFORM "test"."AssertEquals"(_Spent."PasswordResetUUID", "test"."Fixture"('PasswordReset.Fresh'), 'the wrong link was spent');
    PERFORM "test"."AssertEquals"(_Spent."SubjectId"::text, 'subject-member', 'the wrong account came back');
END;
$$ LANGUAGE plpgsql;

-- Marked spent as it is read, before anything has been set at Keycloak. A
-- link that failed halfway is worth one more mail; a link that stayed live in
-- a mailbox is not.
CREATE FUNCTION "test"."TestSpendPasswordReset_WorksExactlyOnce" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."SpendPasswordReset"('reset-fresh');

    PERFORM "test"."AssertTrue"(
        (SELECT "SpentAt" IS NOT NULL FROM "dbo"."PasswordResets"
            WHERE "PasswordResetUUID" = "test"."Fixture"('PasswordReset.Fresh')),
        'a spent link was not marked spent'
    );

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."SpendPasswordReset"(%L)', 'reset-fresh'),
        'a password reset link worked a second time',
        'not valid or has already been used'
    );
END;
$$ LANGUAGE plpgsql;

-- A link already followed and one that was never issued answer the same way.
CREATE FUNCTION "test"."TestSpendPasswordReset_RefusesAnUnknownOrSpentToken" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."SpendPasswordReset"(%L)', 'reset-spent'),
        'a link that had already been followed worked again',
        'not valid or has already been used'
    );

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."SpendPasswordReset"(%L)', 'reset-nobody-issued-this'),
        'a token nobody issued reset a password',
        'not valid or has already been used'
    );

    PERFORM "test"."AssertRaises"(
        'SELECT * FROM "dbo"."SpendPasswordReset"(NULL)',
        'a null token reset a password',
        'not valid or has already been used'
    );

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."SpendPasswordReset"(%L)', ''),
        'an empty token reset a password',
        'not valid or has already been used'
    );
END;
$$ LANGUAGE plpgsql;

-- One hour from when the mail went out. The stale fixture's link was sent two
-- hours ago.
CREATE FUNCTION "test"."TestSpendPasswordReset_RefusesAnExpiredLink" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."SpendPasswordReset"(%L)', 'reset-stale'),
        'a link older than an hour still reset a password',
        'has expired'
    );

    -- Left unspent, so the row still says why it stopped working: it ran out
    -- of time rather than having been used.
    PERFORM "test"."AssertTrue"(
        (SELECT "SpentAt" IS NULL FROM "dbo"."PasswordResets"
            WHERE "PasswordResetUUID" = "test"."Fixture"('PasswordReset.Stale')),
        'an expired link was marked spent'
    );
END;
$$ LANGUAGE plpgsql;

-- Spending a link changes nothing about the account. The password lives in
-- Keycloak and this function does not touch it, and it is not a way to
-- confirm an address either.
CREATE FUNCTION "test"."TestSpendPasswordReset_ChangesNothingAboutTheAccount" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."SpendPasswordReset"('reset-fresh');

    PERFORM "test"."AssertEquals"(
        (SELECT "Users"."Email"::text FROM "dbo"."Users" WHERE "Users"."LoginName" = 'member'),
        'member@example.test',
        'spending a reset link changed the account''s address'
    );
    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''member'') WHERE "IsVerified"',
        2,
        'spending a reset link changed which addresses are verified'
    );
END;
$$ LANGUAGE plpgsql;
