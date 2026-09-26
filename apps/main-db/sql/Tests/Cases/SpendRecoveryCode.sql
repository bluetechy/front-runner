--
-- Spending a recovery code. The weight is on "once": a code that has been used
-- is no code, and one account's code is not another's.
--

CREATE FUNCTION "test"."TestSpendRecoveryCode_SpendsAnUnusedCode" () RETURNS void AS $$
DECLARE
    _Spent record;
BEGIN
    SELECT * INTO _Spent FROM "dbo"."SpendRecoveryCode"('subject-member', 'hash-member-one');

    PERFORM "test"."AssertEquals"(
        _Spent."RecoveryCodeUUID"::text,
        "test"."Fixture"('RecoveryCode.MemberFirst')::text,
        'the wrong code was spent'
    );
    PERFORM "test"."AssertTrue"(_Spent."SpentAt" IS NOT NULL, 'a code was spent without being stamped');
END;
$$ LANGUAGE plpgsql;

-- What the card says afterwards: how many are left. Counted after the spend,
-- so "one left" means one left rather than one left before this.
CREATE FUNCTION "test"."TestSpendRecoveryCode_SaysHowManyAreLeft" () RETURNS void AS $$
DECLARE
    _Spent record;
BEGIN
    SELECT * INTO _Spent FROM "dbo"."SpendRecoveryCode"('subject-member', 'hash-member-one');

    PERFORM "test"."AssertEquals"(_Spent."RemainingCount", 1, 'the wrong number of codes was left');
END;
$$ LANGUAGE plpgsql;

-- Once. A code that could be spent twice is a password that never changes.
CREATE FUNCTION "test"."TestSpendRecoveryCode_RefusesACodeAlreadySpent" () RETURNS void AS $$
DECLARE
    _Again record;
BEGIN
    PERFORM "dbo"."SpendRecoveryCode"('subject-member', 'hash-member-one');

    SELECT * INTO _Again FROM "dbo"."SpendRecoveryCode"('subject-member', 'hash-member-one');

    PERFORM "test"."AssertTrue"(_Again IS NULL, 'a code was spent twice');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSpendRecoveryCode_RefusesACodeSpentLongAgo" () RETURNS void AS $$
DECLARE
    _Spent record;
BEGIN
    SELECT * INTO _Spent FROM "dbo"."SpendRecoveryCode"('subject-member', 'hash-member-spent');

    PERFORM "test"."AssertTrue"(_Spent IS NULL, 'a code that was already used was accepted again');
END;
$$ LANGUAGE plpgsql;

-- Nothing at all rather than an exception: somebody mistyping a code is the
-- ordinary case, and main-api answers a wrong code and a wrong password with
-- the same sentence either way.
CREATE FUNCTION "test"."TestSpendRecoveryCode_AnswersNothingForACodeThatIsNotThere" () RETURNS void AS $$
DECLARE
    _Spent record;
BEGIN
    SELECT * INTO _Spent FROM "dbo"."SpendRecoveryCode"('subject-member', 'hash-nobody-wrote-this');

    PERFORM "test"."AssertTrue"(_Spent IS NULL, 'a code nobody wrote was accepted');
END;
$$ LANGUAGE plpgsql;

-- The code is looked up within the account, not across the table. Otherwise
-- one account's sheet of codes would open every account that happened to draw
-- the same ten characters.
CREATE FUNCTION "test"."TestSpendRecoveryCode_WillNotSpendAnotherAccountsCode" () RETURNS void AS $$
DECLARE
    _Spent record;
BEGIN
    SELECT * INTO _Spent FROM "dbo"."SpendRecoveryCode"('subject-member', 'hash-owner-one');

    PERFORM "test"."AssertTrue"(_Spent IS NULL, 'one account spent another account''s code');
    PERFORM "test"."AssertTrue"(
        (SELECT "SpentAt" IS NULL FROM "dbo"."RecoveryCodes"
            WHERE "RecoveryCodeUUID" = "test"."Fixture"('RecoveryCode.OwnerOnly')),
        'another account''s code was stamped'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSpendRecoveryCode_RefusesNoAccount" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."SpendRecoveryCode"(%L, %L)', '  ', 'hash-member-one'),
        'a code was spent against no account',
        'An account is required'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSpendRecoveryCode_RefusesABlankCode" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."SpendRecoveryCode"(%L, %L)', 'subject-member', '   '),
        'a blank code was accepted',
        'A recovery code is required'
    );
END;
$$ LANGUAGE plpgsql;
