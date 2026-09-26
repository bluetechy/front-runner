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

--
-- The three limits. A text message costs money and arrives on a handset that
-- may not belong to whoever typed the number, so both of those are what these
-- cases are about.
--

-- A double press of "Send the code" is one message, not two. subject-owner's
-- fixture went out at CURRENT_TIMESTAMP, which inside a transaction is now.
CREATE FUNCTION "test"."TestStartPhoneVerification_RefusesASecondCodeInsideAMinute" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."StartPhoneVerification"(%L, %L, %L)', 'subject-owner', '+15555550113', 'hash-owner-second'),
        'a second message went out to an account that had just been texted',
        'before asking for another code'
    );
END;
$$ LANGUAGE plpgsql;

-- And the minute has to end. subject-member's live code is two minutes old.
CREATE FUNCTION "test"."TestStartPhoneVerification_AllowsAnotherCodeAfterAMinute" () RETURNS void AS $$
DECLARE
    _Started record;
BEGIN
    SELECT * INTO _Started FROM "dbo"."StartPhoneVerification"('subject-member', '+15555550122', 'hash-phone-second');

    PERFORM "test"."AssertTrue"(_Started."PhoneVerificationUUID" IS NOT NULL, 'no second code was written a minute on');
END;
$$ LANGUAGE plpgsql;

-- Five an hour is the ceiling on what holding the button down can spend. The
-- rows are staggered so that the newest is past the sixty-second gap, which
-- is what makes this case about the cap rather than about the gap.
CREATE FUNCTION "test"."TestStartPhoneVerification_RefusesASixthCodeInAnHour" () RETURNS void AS $$
BEGIN
    INSERT INTO "dbo"."PhoneVerifications" ("SubjectId", "PhoneNumber", "CodeHash", "SentAt", "CreatedBy")
    SELECT 'subject-flood', '+1555555020' || _Minute, 'hash-flood-' || _Minute, CURRENT_TIMESTAMP - (_Minute || ' minutes')::interval, 'fixtures'
    FROM generate_series(2, 6) AS _Minute;

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."StartPhoneVerification"(%L, %L, %L)', 'subject-flood', '+15555550209', 'hash-flood-sixth'),
        'a sixth code went out to an account inside an hour',
        'Too many codes have been sent'
    );
END;
$$ LANGUAGE plpgsql;

-- The hour rolls. Five messages yesterday is not five messages this hour.
CREATE FUNCTION "test"."TestStartPhoneVerification_CountsOnlyTheLastHourForAnAccount" () RETURNS void AS $$
DECLARE
    _Started record;
BEGIN
    INSERT INTO "dbo"."PhoneVerifications" ("SubjectId", "PhoneNumber", "CodeHash", "SentAt", "CreatedBy")
    SELECT 'subject-flood', '+1555555020' || _Minute, 'hash-flood-' || _Minute, CURRENT_TIMESTAMP - interval '2 hours', 'fixtures'
    FROM generate_series(2, 6) AS _Minute;

    SELECT * INTO _Started FROM "dbo"."StartPhoneVerification"('subject-flood', '+15555550209', 'hash-flood-sixth');

    PERFORM "test"."AssertTrue"(_Started."PhoneVerificationUUID" IS NOT NULL, 'an hour-old run of messages still counted against the cap');
END;
$$ LANGUAGE plpgsql;

-- The limit that is not about money. Three codes to one number in an hour is
-- the most anybody gets, and it is counted across accounts: the number on
-- this form is whatever was typed into it, so one account per message would
-- make the form a way to ring a stranger's phone all afternoon.
CREATE FUNCTION "test"."TestStartPhoneVerification_RefusesAFourthCodeToOneNumber" () RETURNS void AS $$
BEGIN
    INSERT INTO "dbo"."PhoneVerifications" ("SubjectId", "PhoneNumber", "CodeHash", "SentAt", "CreatedBy")
    SELECT 'subject-crowd-' || _Minute, '+15555550150', 'hash-crowd-' || _Minute, CURRENT_TIMESTAMP - (_Minute || ' minutes')::interval, 'fixtures'
    FROM generate_series(2, 4) AS _Minute;

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."StartPhoneVerification"(%L, %L, %L)', 'subject-fresh', '+15555550150', 'hash-crowd-fourth'),
        'a fourth account texted a code to a number three others had already texted',
        'Too many codes have been sent'
    );
END;
$$ LANGUAGE plpgsql;

-- The number's hour rolls too, or a number would be spent for good after
-- three messages.
CREATE FUNCTION "test"."TestStartPhoneVerification_CountsOnlyTheLastHourForANumber" () RETURNS void AS $$
DECLARE
    _Started record;
BEGIN
    INSERT INTO "dbo"."PhoneVerifications" ("SubjectId", "PhoneNumber", "CodeHash", "SentAt", "CreatedBy")
    SELECT 'subject-crowd-' || _Minute, '+15555550150', 'hash-crowd-' || _Minute, CURRENT_TIMESTAMP - interval '2 hours', 'fixtures'
    FROM generate_series(2, 4) AS _Minute;

    SELECT * INTO _Started FROM "dbo"."StartPhoneVerification"('subject-fresh', '+15555550150', 'hash-crowd-fourth');

    PERFORM "test"."AssertTrue"(_Started."PhoneVerificationUUID" IS NOT NULL, 'an hour-old run of messages still counted against the number');
END;
$$ LANGUAGE plpgsql;

-- A refused message leaves the code somebody is already holding alone. The
-- retire happens after the limits for exactly this reason: an account that
-- asks twice in a second must not lose the code from the first message.
CREATE FUNCTION "test"."TestStartPhoneVerification_LeavesTheLiveCodeAloneWhenRefused" () RETURNS void AS $$
BEGIN
    BEGIN
        PERFORM "dbo"."StartPhoneVerification"('subject-owner', '+15555550113', 'hash-owner-second');
    EXCEPTION WHEN raise_exception THEN
        NULL;
    END;

    PERFORM "test"."AssertTrue"(
        (SELECT "SpentAt" IS NULL FROM "dbo"."PhoneVerifications"
            WHERE "PhoneVerificationUUID" = "test"."Fixture"('PhoneVerification.OwnerLive')),
        'a refused message retired the code the account was already holding'
    );
END;
$$ LANGUAGE plpgsql;
