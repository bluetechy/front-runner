--
-- Asking for another verification link. The point of these is that the old one
-- stops working.
--

CREATE FUNCTION "test"."TestResendUserEmailVerification_ReplacesTheOldToken" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."ResendUserEmailVerification"('member', "test"."Fixture"('UserEmail.MemberFresh'), 'token-second');

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."VerifyUserEmail"(%L)', 'token-fresh'),
        'the replaced link still worked',
        'not valid or has already been used'
    );

    PERFORM "dbo"."VerifyUserEmail"('token-second');

    PERFORM "test"."AssertRowCount"(
        format(
            'SELECT * FROM "dbo"."GetUserEmails"(''member'') WHERE "UserEmailUUID" = %L AND "IsVerified"',
            "test"."Fixture"('UserEmail.MemberFresh')
        ),
        1,
        'the new link did not verify the address'
    );
END;
$$ LANGUAGE plpgsql;

-- The clock restarts, which is the whole point for a row whose link expired.
CREATE FUNCTION "test"."TestResendUserEmailVerification_RestartsTheClock" () RETURNS void AS $$
DECLARE
    _SentAt TIMESTAMPTZ;
BEGIN
    PERFORM "dbo"."ResendUserEmailVerification"('member', "test"."Fixture"('UserEmail.MemberStale'), 'token-second');

    SELECT "UserEmails"."VerificationSentAt" INTO _SentAt
    FROM "dbo"."UserEmails"
    WHERE "UserEmails"."UserEmailUUID" = "test"."Fixture"('UserEmail.MemberStale');

    PERFORM "test"."AssertTrue"(
        _SentAt > CURRENT_TIMESTAMP - interval '1 minute',
        'the verification clock was not restarted'
    );
END;
$$ LANGUAGE plpgsql;

-- Sending mail to an address somebody has already confirmed, because a request
-- said to, is how a verification endpoint becomes somebody else's mail cannon.
CREATE FUNCTION "test"."TestResendUserEmailVerification_RefusesAnAlreadyVerifiedAddress" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."ResendUserEmailVerification"(%L, %L, %L)', 'member', "test"."Fixture"('UserEmail.MemberWork'), 'token-second'),
        'a verified address was sent another verification link',
        'already verified'
    );

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."ResendUserEmailVerification"(%L, %L, %L)', 'member', "test"."Fixture"('UserEmail.MemberPrimary'), 'token-second'),
        'the primary address was sent another verification link',
        'already verified'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestResendUserEmailVerification_RefusesSomebodyElsesAddress" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."ResendUserEmailVerification"(%L, %L, %L)', 'owner', "test"."Fixture"('UserEmail.MemberFresh'), 'token-second'),
        'one account sent a verification link for another account''s address',
        'Action cannot be performed.'
    );

    -- And the token it offered must not have landed on the row.
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."VerifyUserEmail"(%L)', 'token-second'),
        'a refused resend wrote its token anyway',
        'not valid or has already been used'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestResendUserEmailVerification_RequiresAToken" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."ResendUserEmailVerification"(%L, %L, NULL)', 'member', "test"."Fixture"('UserEmail.MemberFresh')),
        'a link was resent with no token',
        'verification token is required'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestResendUserEmailVerification_AnswersWithTheWholeList" () RETURNS void AS $$
DECLARE
    _Rows bigint;
BEGIN
    SELECT count(*) INTO _Rows
    FROM "dbo"."ResendUserEmailVerification"('member', "test"."Fixture"('UserEmail.MemberFresh'), 'token-second') AS "Addresses";

    PERFORM "test"."AssertEquals"(_Rows, 4::bigint, 'ResendUserEmailVerification did not answer with the whole list');
END;
$$ LANGUAGE plpgsql;
