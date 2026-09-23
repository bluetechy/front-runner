--
-- Spending a verification token. The token is the whole of the authorization
-- here, so what these hold is that it works exactly once, that it stops
-- working, and that a wrong one gives nothing away.
--

CREATE FUNCTION "test"."TestVerifyUserEmail_MarksTheAddressVerified" () RETURNS void AS $$
DECLARE
    _Verified record;
    _Row record;
BEGIN
    SELECT * INTO _Verified FROM "dbo"."VerifyUserEmail"('token-fresh');

    PERFORM "test"."AssertEquals"(_Verified."UserEmailUUID", "test"."Fixture"('UserEmail.MemberFresh'), 'the wrong address was verified');
    PERFORM "test"."AssertEquals"(_Verified."LoginName"::text, 'member', 'the wrong account came back');
    PERFORM "test"."AssertEquals"(_Verified."Email"::text, 'marcus.new@example.test', 'the wrong address came back');

    SELECT * INTO _Row FROM "dbo"."GetUserEmails"('member')
    WHERE "UserEmailUUID" = "test"."Fixture"('UserEmail.MemberFresh');

    PERFORM "test"."AssertTrue"(_Row."IsVerified", 'the address did not end up verified');
    PERFORM "test"."AssertTrue"(_Row."VerifiedAt" IS NOT NULL, 'the address was verified with no timestamp');
END;
$$ LANGUAGE plpgsql;

-- Verifying an address must not promote it. Which address somebody signs in
-- with is dbo.SetPrimaryUserEmail's to change, and this function has no
-- session behind it at all.
CREATE FUNCTION "test"."TestVerifyUserEmail_DoesNotChangeTheLogin" () RETURNS void AS $$
DECLARE
    _Primary record;
BEGIN
    PERFORM "dbo"."VerifyUserEmail"('token-fresh');

    SELECT * INTO _Primary FROM "dbo"."GetUserEmails"('member') WHERE "IsPrimary";

    PERFORM "test"."AssertEquals"(_Primary."UserEmailUUID", "test"."Fixture"('UserEmail.MemberPrimary'), 'verifying an address moved the primary');
    PERFORM "test"."AssertEquals"(
        (SELECT "Users"."Email"::text FROM "dbo"."Users" WHERE "Users"."LoginName" = 'member'),
        'member@example.test',
        'verifying an address changed dbo.Users."Email"'
    );
END;
$$ LANGUAGE plpgsql;

-- The token is cleared as it is spent, so a link works once. A forwarded mail
-- is not a standing key to an account.
CREATE FUNCTION "test"."TestVerifyUserEmail_SpendsTheTokenOnce" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."VerifyUserEmail"('token-fresh');

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."VerifyUserEmail"(%L)', 'token-fresh'),
        'a verification link worked a second time',
        'not valid or has already been used'
    );
END;
$$ LANGUAGE plpgsql;

-- A link that was never valid and one that has been used answer the same way:
-- there is nothing to gain by telling somebody holding a wrong token which it
-- was.
CREATE FUNCTION "test"."TestVerifyUserEmail_RefusesAnUnknownToken" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."VerifyUserEmail"(%L)', 'token-that-was-never-issued'),
        'a token nobody issued verified an address',
        'not valid or has already been used'
    );

    PERFORM "test"."AssertRaises"(
        'SELECT * FROM "dbo"."VerifyUserEmail"(NULL)',
        'a null token verified an address',
        'not valid or has already been used'
    );

    -- Every verified row holds NULL, and NULLs are distinct in Postgres. An
    -- empty string must not match one of them either.
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."VerifyUserEmail"(%L)', ''),
        'an empty token verified an address',
        'not valid or has already been used'
    );
END;
$$ LANGUAGE plpgsql;

-- Twenty-four hours from when the mail went out. The stale fixture's link was
-- sent forty-eight hours ago.
CREATE FUNCTION "test"."TestVerifyUserEmail_RefusesAnExpiredLink" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."VerifyUserEmail"(%L)', 'token-stale'),
        'a link older than a day still verified an address',
        'has expired'
    );

    SELECT * INTO _Row FROM "dbo"."GetUserEmails"('member')
    WHERE "UserEmailUUID" = "test"."Fixture"('UserEmail.MemberStale');

    PERFORM "test"."AssertFalse"(_Row."IsVerified", 'an expired link verified the address anyway');
END;
$$ LANGUAGE plpgsql;

-- An expired token is left in place rather than cleared, because the row still
-- needs one to be resent and dbo.ResendUserEmailVerification writes over it.
CREATE FUNCTION "test"."TestVerifyUserEmail_LeavesAnExpiredTokenInPlaceToBeReplaced" () RETURNS void AS $$
BEGIN
    BEGIN
        PERFORM "dbo"."VerifyUserEmail"('token-stale');
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    PERFORM "dbo"."ResendUserEmailVerification"('member', "test"."Fixture"('UserEmail.MemberStale'), 'token-replacement');

    PERFORM "dbo"."VerifyUserEmail"('token-replacement');

    PERFORM "test"."AssertRowCount"(
        format(
            'SELECT * FROM "dbo"."GetUserEmails"(''member'') WHERE "UserEmailUUID" = %L AND "IsVerified"',
            "test"."Fixture"('UserEmail.MemberStale')
        ),
        1,
        'a resent link did not verify an address whose first link had expired'
    );
END;
$$ LANGUAGE plpgsql;
