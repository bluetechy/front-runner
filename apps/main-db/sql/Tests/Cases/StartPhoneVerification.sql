--
-- Starting a phone verification. The weight is on what it retires: asking for
-- a second message has to stop the first code working, or a mistyped number
-- leaves a live code pointed at a phone that is not the account's.
--

CREATE FUNCTION "test"."TestStartPhoneVerification_WritesTheCode" () RETURNS void AS $$
DECLARE
    _Started record;
BEGIN
    SELECT * INTO _Started FROM "dbo"."StartPhoneVerification"('subject-fresh', '+15555550199', 'hash-fresh');

    PERFORM "test"."AssertTrue"(_Started."PhoneVerificationUUID" IS NOT NULL, 'no verification was written');
    PERFORM "test"."AssertTrue"(_Started."SentAt" IS NOT NULL, 'a verification was written without a sent time');
    PERFORM "test"."AssertEquals"(
        (SELECT "PhoneNumber" FROM "dbo"."PhoneVerifications" WHERE "PhoneVerificationUUID" = _Started."PhoneVerificationUUID"),
        '+15555550199'::varchar(20),
        'the wrong number was written'
    );
END;
$$ LANGUAGE plpgsql;

-- A new row starts at no attempts, because "Attempts" is what makes five
-- guesses the limit rather than five guesses ever.
CREATE FUNCTION "test"."TestStartPhoneVerification_StartsWithNoAttempts" () RETURNS void AS $$
DECLARE
    _Started record;
BEGIN
    SELECT * INTO _Started FROM "dbo"."StartPhoneVerification"('subject-fresh', '+15555550199', 'hash-fresh');

    PERFORM "test"."AssertEquals"(
        (SELECT "Attempts" FROM "dbo"."PhoneVerifications" WHERE "PhoneVerificationUUID" = _Started."PhoneVerificationUUID"),
        0,
        'a new verification started with attempts against it'
    );
END;
$$ LANGUAGE plpgsql;

-- "Send it again" has to mean the first one stops working.
CREATE FUNCTION "test"."TestStartPhoneVerification_RetiresTheOutstandingCode" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."StartPhoneVerification"('subject-member', '+15555550122', 'hash-phone-second');

    PERFORM "test"."AssertTrue"(
        (SELECT "SpentAt" IS NOT NULL FROM "dbo"."PhoneVerifications"
            WHERE "PhoneVerificationUUID" = "test"."Fixture"('PhoneVerification.MemberLive')),
        'an earlier code was left working after a second one was sent'
    );
END;
$$ LANGUAGE plpgsql;

-- One account's second message is not another account's business.
CREATE FUNCTION "test"."TestStartPhoneVerification_LeavesAnotherAccountAlone" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."StartPhoneVerification"('subject-member', '+15555550122', 'hash-phone-second');

    PERFORM "test"."AssertTrue"(
        (SELECT "SpentAt" IS NULL FROM "dbo"."PhoneVerifications"
            WHERE "PhoneVerificationUUID" = "test"."Fixture"('PhoneVerification.OwnerLive')),
        'one account''s new code retired another account''s'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestStartPhoneVerification_RefusesNoAccount" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."StartPhoneVerification"(%L, %L, %L)', '  ', '+15555550199', 'hash-fresh'),
        'a verification was started against no account',
        'An account is required'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestStartPhoneVerification_RefusesNoNumber" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."StartPhoneVerification"(%L, %L, %L)', 'subject-fresh', '   ', 'hash-fresh'),
        'a verification was started with no number to send to',
        'A phone number is required'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestStartPhoneVerification_RefusesABlankCode" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."StartPhoneVerification"(%L, %L, %L)', 'subject-fresh', '+15555550199', '  '),
        'a blank code was stored',
        'A verification code is required'
    );
END;
$$ LANGUAGE plpgsql;
