--
-- Reading the state of an account's recovery codes: how many are left, out of
-- how many, and when they were made. No code ever comes back out, and there is
-- nothing in the table that could -- it holds hashes.
--

CREATE FUNCTION "test"."TestGetRecoveryCodes_CountsWhatIsLeftOfTheBatch" () RETURNS void AS $$
DECLARE
    _State record;
BEGIN
    SELECT * INTO _State FROM "dbo"."GetRecoveryCodes"('subject-member');

    PERFORM "test"."AssertEquals"(_State."CodeCount", 3, 'the batch was the wrong size');
    PERFORM "test"."AssertEquals"(_State."RemainingCount", 2, 'the wrong number of codes was spendable');
    PERFORM "test"."AssertEquals"(
        _State."BatchId"::text,
        "test"."Fixture"('RecoveryCode.MemberBatch')::text,
        'the wrong batch was read'
    );
    PERFORM "test"."AssertTrue"(_State."CreatedAt" IS NOT NULL, 'a batch was read with no date');
END;
$$ LANGUAGE plpgsql;

-- One row of zeros rather than no rows. "None yet" is a state the card draws,
-- and a caller that had to tell an empty answer apart from a failed read would
-- be doing the same work twice.
CREATE FUNCTION "test"."TestGetRecoveryCodes_AnswersZeroForAnAccountWithNone" () RETURNS void AS $$
DECLARE
    _State record;
BEGIN
    SELECT * INTO _State FROM "dbo"."GetRecoveryCodes"('subject-nobody-here-has-signed-in');

    -- Counted rather than asked whether the record is null: a record whose
    -- every column is NULL -- which is exactly what this row is -- reads as
    -- NULL itself in plpgsql, so "IS NOT NULL" would call a row that did
    -- arrive a row that did not.
    PERFORM "test"."AssertEquals"(
        (SELECT count(*)::integer FROM "dbo"."GetRecoveryCodes"('subject-nobody-here-has-signed-in')),
        1,
        'an account with no codes got no row at all'
    );
    PERFORM "test"."AssertEquals"(_State."RemainingCount", 0, 'an account with no codes had some left');
    PERFORM "test"."AssertEquals"(_State."CodeCount", 0, 'an account with no codes had a batch size');
    PERFORM "test"."AssertTrue"(_State."BatchId" IS NULL, 'an account with no codes named a batch');
    PERFORM "test"."AssertTrue"(_State."CreatedAt" IS NULL, 'an account with no codes had a date');
END;
$$ LANGUAGE plpgsql;

-- The newest batch, which is the only one with anything spendable in it:
-- dbo.ReplaceRecoveryCodes retires every earlier code as it writes.
CREATE FUNCTION "test"."TestGetRecoveryCodes_ReadsTheNewestBatch" () RETURNS void AS $$
DECLARE
    _Written record;
    _State record;
BEGIN
    SELECT * INTO _Written FROM "dbo"."ReplaceRecoveryCodes"(
        'subject-member',
        ARRAY['hash-newest-one', 'hash-newest-two']::varchar(64)[]
    );

    SELECT * INTO _State FROM "dbo"."GetRecoveryCodes"('subject-member');

    PERFORM "test"."AssertEquals"(_State."BatchId"::text, _Written."BatchId"::text, 'an older batch was read');
    PERFORM "test"."AssertEquals"(_State."CodeCount", 2, 'the newest batch was the wrong size');
    PERFORM "test"."AssertEquals"(_State."RemainingCount", 2, 'the newest batch was not all spendable');
END;
$$ LANGUAGE plpgsql;

-- One account's codes, counted alone. The owner holds one of their own, and it
-- must not show up in the member's count.
CREATE FUNCTION "test"."TestGetRecoveryCodes_CountsOnlyThatAccount" () RETURNS void AS $$
DECLARE
    _Owner record;
BEGIN
    SELECT * INTO _Owner FROM "dbo"."GetRecoveryCodes"('subject-owner');

    PERFORM "test"."AssertEquals"(_Owner."CodeCount", 1, 'another account''s codes were counted');
    PERFORM "test"."AssertEquals"(_Owner."RemainingCount", 1, 'another account''s codes were counted as spendable');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetRecoveryCodes_RefusesNoAccount" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."GetRecoveryCodes"(%L)', '  '),
        'codes were read for no account',
        'An account is required'
    );
END;
$$ LANGUAGE plpgsql;
