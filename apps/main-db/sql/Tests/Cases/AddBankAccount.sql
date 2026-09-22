--
-- Saving a bank account. The half of the wallet where one number is secret and
-- the other deliberately is not.
--

CREATE FUNCTION "test"."TestAddBankAccount_KeepsTheLastFourAndNothingElse" () RETURNS void AS $$
DECLARE
    _Saved record;
BEGIN
    SELECT * INTO _Saved FROM "dbo"."AddBankAccount"(
        'member', 'Marcus Member', 'Savings', '021000021', '000123456789', 'test-key'
    ) AS "Methods" LIMIT 1;

    PERFORM "test"."AssertEquals"(_Saved."Kind"::text, 'BankAccount', 'a saved bank account did not come back as one');
    PERFORM "test"."AssertEquals"(_Saved."Last4"::text, '6789', 'the last four digits of the account number were not kept');
    PERFORM "test"."AssertEquals"(_Saved."AccountType"::text, 'Savings', 'the account type was not kept');
    PERFORM "test"."AssertTrue"(_Saved."Brand" IS NULL, 'a bank account came back carrying a card brand');
    PERFORM "test"."AssertFalse"(_Saved."IsExpired", 'a bank account came back expired');
END;
$$ LANGUAGE plpgsql;

-- A routing number names a bank and is published in a directory; an account
-- number names an account. Only the second one is worth encrypting, and both
-- halves of that are asserted here.
CREATE FUNCTION "test"."TestAddBankAccount_EncryptsTheAccountNumberAndNotTheRouting" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    PERFORM "dbo"."AddBankAccount"(
        'member', 'Marcus Member', 'Checking', '021000021', '000123456789', 'test-key'
    );

    SELECT * INTO _Row FROM "dbo"."BankAccounts"
    WHERE "BankAccounts"."UserUUID" = "test"."Fixture"('User.Member');

    PERFORM "test"."AssertEquals"(_Row."RoutingNumber"::text, '021000021', 'the routing number was not stored as given');
    PERFORM "test"."AssertTrue"(
        position('000123456789'::bytea in _Row."Number") = 0,
        'the account number is sitting in the column in the clear'
    );
    PERFORM "test"."AssertEquals"(
        public.pgp_sym_decrypt(_Row."Number", 'test-key'),
        '000123456789',
        'the stored account number does not decrypt back to what was saved'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAddBankAccount_DefaultsToChecking" () RETURNS void AS $$
DECLARE
    _Saved record;
BEGIN
    SELECT * INTO _Saved FROM "dbo"."AddBankAccount"(
        'member', 'Marcus Member', NULL, '021000021', '000123456789', 'test-key'
    ) AS "Methods" LIMIT 1;

    PERFORM "test"."AssertEquals"(_Saved."AccountType"::text, 'Checking', 'an unstated account type did not fall back to checking');
END;
$$ LANGUAGE plpgsql;

-- Two answers and no others, held by the column's check constraint rather than
-- by whichever application happened to be asked.
CREATE FUNCTION "test"."TestAddBankAccount_RefusesAnAccountTypeItDoesNotOffer" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."AddBankAccount"(%L, %L, %L, %L, %L, %L)',
            'member', 'Marcus Member', 'Brokerage', '021000021', '000123456789', 'test-key'
        ),
        'an account type outside the two offered was stored',
        'BankAccounts_AccountType_Check'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAddBankAccount_RefusesARoutingNumberThatIsNotNineDigits" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."AddBankAccount"(%L, %L, %L, %L, %L, %L)',
            'member', 'Marcus Member', 'Checking', '02100', '000123456789', 'test-key'
        ),
        'a five-digit routing number was accepted',
        'nine digits'
    );
END;
$$ LANGUAGE plpgsql;

-- Unlike every optional text field in this schema, this one is required: an
-- account with no name on it is not an account.
CREATE FUNCTION "test"."TestAddBankAccount_RequiresANameOnTheAccount" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."AddBankAccount"(%L, %L, %L, %L, %L, %L)',
            'member', '   ', 'Checking', '021000021', '000123456789', 'test-key'
        ),
        'a bank account was saved with no name on it',
        'name on the account'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAddBankAccount_RefusesToStoreWithoutAKey" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."AddBankAccount"(%L, %L, %L, %L, %L, %L)',
            'member', 'Marcus Member', 'Checking', '021000021', '000123456789', ''
        ),
        'an account was stored with no encryption key',
        'encryption key'
    );
END;
$$ LANGUAGE plpgsql;
