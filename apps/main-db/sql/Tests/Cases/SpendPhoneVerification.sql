--
-- Spending a phone verification code. Six digits is a fifth of a million
-- guesses, so most of what is asserted here is about the three ways a code
-- stops working rather than about the way it works.
--

CREATE FUNCTION "test"."TestSpendPhoneVerification_AnswersTheNumberTheCodeProves" () RETURNS void AS $$
DECLARE
    _Proved record;
BEGIN
    SELECT * INTO _Proved FROM "dbo"."SpendPhoneVerification"('subject-member', 'hash-phone-member');

    PERFORM "test"."AssertEquals"(_Proved."PhoneNumber", '+15555550111'::varchar(20), 'the wrong number was proved');
    PERFORM "test"."AssertTrue"(_Proved."SpentAt" IS NOT NULL, 'a code was spent without being stamped');
END;
$$ LANGUAGE plpgsql;

-- Once. A code that could be spent twice would let a message forwarded to
-- somebody else attach their phone to the account after the fact.
CREATE FUNCTION "test"."TestSpendPhoneVerification_RefusesACodeAlreadySpent" () RETURNS void AS $$
DECLARE
    _Again record;
BEGIN
    PERFORM "dbo"."SpendPhoneVerification"('subject-member', 'hash-phone-member');

    SELECT * INTO _Again FROM "dbo"."SpendPhoneVerification"('subject-member', 'hash-phone-member');

    PERFORM "test"."AssertTrue"(_Again IS NULL, 'a code was spent twice');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSpendPhoneVerification_AnswersNothingForAWrongCode" () RETURNS void AS $$
DECLARE
    _Proved record;
BEGIN
    SELECT * INTO _Proved FROM "dbo"."SpendPhoneVerification"('subject-member', 'hash-nobody-sent-this');

    PERFORM "test"."AssertTrue"(_Proved IS NULL, 'a code nobody sent was accepted');
END;
$$ LANGUAGE plpgsql;

-- The wrong guess is counted, which is the whole of what stands between six
-- digits and an afternoon with a script.
CREATE FUNCTION "test"."TestSpendPhoneVerification_CountsAWrongGuess" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."SpendPhoneVerification"('subject-member', 'hash-nobody-sent-this');

    PERFORM "test"."AssertEquals"(
        (SELECT "Attempts" FROM "dbo"."PhoneVerifications"
            WHERE "PhoneVerificationUUID" = "test"."Fixture"('PhoneVerification.MemberLive')),
        1,
        'a wrong guess was not counted'
    );
END;
$$ LANGUAGE plpgsql;

-- Four wrong guesses and the right code still works: the limit is there to
-- stop a script, not to punish somebody reading digits off a lock screen.
CREATE FUNCTION "test"."TestSpendPhoneVerification_StillWorksAfterFourWrongGuesses" () RETURNS void AS $$
DECLARE
    _Proved record;
BEGIN
    FOR _Guess IN 1..4 LOOP
        PERFORM "dbo"."SpendPhoneVerification"('subject-member', 'hash-wrong-' || _Guess);
    END LOOP;

    SELECT * INTO _Proved FROM "dbo"."SpendPhoneVerification"('subject-member', 'hash-phone-member');

    PERFORM "test"."AssertTrue"(_Proved IS NOT NULL, 'the right code stopped working too early');
END;
$$ LANGUAGE plpgsql;

-- Five, and the message has to be sent again. The row is retired rather than
-- merely counted past, so nothing downstream has to remember the limit.
CREATE FUNCTION "test"."TestSpendPhoneVerification_RetiresTheCodeAfterFiveWrongGuesses" () RETURNS void AS $$
DECLARE
    _Proved record;
BEGIN
    FOR _Guess IN 1..5 LOOP
        PERFORM "dbo"."SpendPhoneVerification"('subject-member', 'hash-wrong-' || _Guess);
    END LOOP;

    PERFORM "test"."AssertTrue"(
        (SELECT "SpentAt" IS NOT NULL FROM "dbo"."PhoneVerifications"
            WHERE "PhoneVerificationUUID" = "test"."Fixture"('PhoneVerification.MemberLive')),
        'a code survived five wrong guesses'
    );

    SELECT * INTO _Proved FROM "dbo"."SpendPhoneVerification"('subject-member', 'hash-phone-member');
    PERFORM "test"."AssertTrue"(_Proved IS NULL, 'the right code still worked after the row was retired');
END;
$$ LANGUAGE plpgsql;

-- Ten minutes. The fixture's code was sent an hour ago.
CREATE FUNCTION "test"."TestSpendPhoneVerification_RefusesACodeThatRanOutOfTime" () RETURNS void AS $$
DECLARE
    _Proved record;
BEGIN
    SELECT * INTO _Proved FROM "dbo"."SpendPhoneVerification"('subject-stale', 'hash-phone-stale');

    PERFORM "test"."AssertTrue"(_Proved IS NULL, 'a code from an hour ago was accepted');
END;
$$ LANGUAGE plpgsql;

-- And it is retired as it is refused, so a clock that moves backwards
-- somewhere cannot bring it back.
CREATE FUNCTION "test"."TestSpendPhoneVerification_RetiresACodeThatRanOutOfTime" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."SpendPhoneVerification"('subject-stale', 'hash-phone-stale');

    PERFORM "test"."AssertTrue"(
        (SELECT "SpentAt" IS NOT NULL FROM "dbo"."PhoneVerifications"
            WHERE "PhoneVerificationUUID" = "test"."Fixture"('PhoneVerification.MemberExpired')),
        'a code that ran out of time was left outstanding'
    );
END;
$$ LANGUAGE plpgsql;

-- One account's code cannot prove another account's number, which is the
-- reason the lookup is inside the account rather than across the table.
CREATE FUNCTION "test"."TestSpendPhoneVerification_WillNotSpendAnotherAccountsCode" () RETURNS void AS $$
DECLARE
    _Proved record;
BEGIN
    SELECT * INTO _Proved FROM "dbo"."SpendPhoneVerification"('subject-member', 'hash-phone-owner');

    PERFORM "test"."AssertTrue"(_Proved IS NULL, 'one account spent another account''s code');
    PERFORM "test"."AssertTrue"(
        (SELECT "SpentAt" IS NULL FROM "dbo"."PhoneVerifications"
            WHERE "PhoneVerificationUUID" = "test"."Fixture"('PhoneVerification.OwnerLive')),
        'another account''s code was stamped'
    );
END;
$$ LANGUAGE plpgsql;

-- Nothing outstanding at all, which is what somebody who never started
-- looks like.
CREATE FUNCTION "test"."TestSpendPhoneVerification_AnswersNothingWhenNothingWasStarted" () RETURNS void AS $$
DECLARE
    _Proved record;
BEGIN
    SELECT * INTO _Proved FROM "dbo"."SpendPhoneVerification"('subject-nobody', 'hash-phone-member');

    PERFORM "test"."AssertTrue"(_Proved IS NULL, 'a code was spent against an account that started nothing');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSpendPhoneVerification_RefusesNoAccount" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."SpendPhoneVerification"(%L, %L)', '  ', 'hash-phone-member'),
        'a code was spent against no account',
        'An account is required'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSpendPhoneVerification_RefusesABlankCode" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."SpendPhoneVerification"(%L, %L)', 'subject-member', '   '),
        'a blank code was accepted',
        'A verification code is required'
    );
END;
$$ LANGUAGE plpgsql;
