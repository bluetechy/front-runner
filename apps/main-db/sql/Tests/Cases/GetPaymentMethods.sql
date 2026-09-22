--
-- Reading a wallet: both kinds in one list, in one order, and never the number.
--

CREATE FUNCTION "test"."TestGetPaymentMethods_IsEmptyForAnAccountWithNothingSaved" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetPaymentMethods"('member');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'the fixtures already carry a wallet for this account');
END;
$$ LANGUAGE plpgsql;

-- Not an error. There is nothing secret in "you have saved nothing", and a
-- reader asking for a wallet wants a list either way.
CREATE FUNCTION "test"."TestGetPaymentMethods_IsEmptyForAnAccountThatDoesNotExist" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetPaymentMethods"('nobody');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'an account that does not exist has a wallet');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPaymentMethods_ReturnsCardsAndAccountsInOneList" () RETURNS void AS $$
DECLARE
    _Kinds text;
BEGIN
    PERFORM "dbo"."AddCreditCard"('member', 'Marcus Member', '4111111111111111', 4::smallint,
        (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint, '', '', '', '', '', 'test-key');
    PERFORM "dbo"."AddBankAccount"('member', 'Marcus Member', 'Checking', '021000021', '000123456789', 'test-key');

    SELECT string_agg("Methods"."Kind", ',' ORDER BY "Methods"."Kind")
    INTO _Kinds
    FROM "dbo"."GetPaymentMethods"('member') AS "Methods";

    PERFORM "test"."AssertEquals"(_Kinds, 'BankAccount,CreditCard', 'the wallet did not hold one of each');
END;
$$ LANGUAGE plpgsql;

-- A wallet is one person's. Nothing here filters by organization, because a
-- card belongs to the human being rather than to a company they are in.
CREATE FUNCTION "test"."TestGetPaymentMethods_ShowsOnlyTheAccountsOwnMethods" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    PERFORM "dbo"."AddCreditCard"('member', 'Marcus Member', '4111111111111111', 4::smallint,
        (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint, '', '', '', '', '', 'test-key');

    SELECT count(*) INTO _Count FROM "dbo"."GetPaymentMethods"('owner');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'one account can see another account''s wallet');
END;
$$ LANGUAGE plpgsql;

-- Newest first, by when it was saved: the order the person added them in,
-- which is the one they remember. Backdating is what makes this a test of the
-- ordering rule -- CURRENT_TIMESTAMP does not move inside a transaction, so
-- all three are saved at the same instant and the sort has nothing but the
-- random UUID left to go on. See apps/main-db/CLAUDE.md.
CREATE FUNCTION "test"."TestGetPaymentMethods_PutsTheNewestFirst" () RETURNS void AS $$
DECLARE
    _Order text;
BEGIN
    PERFORM "test"."FillWallet"();

    SELECT string_agg("Methods"."NameOnMethod", ',') INTO _Order
    FROM "dbo"."GetPaymentMethods"('member') AS "Methods";
    PERFORM "test"."AssertEquals"(_Order, 'Third,Second,First', 'the wallet is not newest-first by when each method was added');
END;
$$ LANGUAGE plpgsql;

-- Choosing a default changes which method pays, not where it sits. A list that
-- rearranged itself under the cursor that clicked it would make the person
-- check what they had just done, so the order is held against every one of the
-- three: the newest, the oldest, and the one in the middle.
CREATE FUNCTION "test"."TestGetPaymentMethods_DoesNotReorderWhenTheDefaultChanges" () RETURNS void AS $$
DECLARE
    _Name text;
    _Chosen record;
    _Order text;
BEGIN
    PERFORM "test"."FillWallet"();

    FOREACH _Name IN ARRAY ARRAY['Second', 'Third', 'First'] LOOP
        SELECT * INTO _Chosen FROM "dbo"."GetPaymentMethods"('member') AS "Methods"
        WHERE "Methods"."NameOnMethod" = _Name;
        PERFORM "dbo"."SetDefaultPaymentMethod"('member', _Chosen."Kind", _Chosen."PaymentMethodUUID");

        SELECT string_agg("Methods"."NameOnMethod", ',') INTO _Order
        FROM "dbo"."GetPaymentMethods"('member') AS "Methods";
        PERFORM "test"."AssertEquals"(_Order, 'Third,Second,First', format('choosing %s as the default reordered the wallet', _Name));

        SELECT * INTO _Chosen FROM "dbo"."GetPaymentMethods"('member') AS "Methods"
        WHERE "Methods"."IsDefault";
        PERFORM "test"."AssertEquals"(_Chosen."NameOnMethod"::text, _Name, format('choosing %s did not make it the default', _Name));
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- "IsExpired" is a fact about today rather than about the card, so it is
-- computed here rather than stored. A card is good through the last day of the
-- month printed on it, which is the boundary this pins.
CREATE FUNCTION "test"."TestGetPaymentMethods_ReadsACardAsGoodThroughItsLastMonth" () RETURNS void AS $$
DECLARE
    _Expired boolean;
BEGIN
    PERFORM "dbo"."AddCreditCard"('member', 'Marcus Member', '4111111111111111',
        EXTRACT(month FROM CURRENT_DATE)::smallint, EXTRACT(year FROM CURRENT_DATE)::smallint,
        '', '', '', '', '', 'test-key');

    SELECT "Methods"."IsExpired" INTO _Expired FROM "dbo"."GetPaymentMethods"('member') AS "Methods";
    PERFORM "test"."AssertFalse"(_Expired, 'a card expiring this month is already being read as expired');

    -- A card that ran out while it sat in the wallet. dbo.AddCreditCard would
    -- refuse to add this one today, so it is written directly.
    UPDATE "dbo"."CreditCards" SET "ExpirationMonth" = 1, "ExpirationYear" = 2001
    WHERE "CreditCards"."UserUUID" = "test"."Fixture"('User.Member');

    SELECT "Methods"."IsExpired" INTO _Expired FROM "dbo"."GetPaymentMethods"('member') AS "Methods";
    PERFORM "test"."AssertTrue"(_Expired, 'a card that expired in 2001 is not being read as expired');
END;
$$ LANGUAGE plpgsql;

-- The column is not in the return shape at all. This is the test that fails if
-- somebody adds it "just for the API", which is how a card number reaches a log.
CREATE FUNCTION "test"."TestGetPaymentMethods_NeverReturnsTheStoredNumber" () RETURNS void AS $$
DECLARE
    _Found bigint;
BEGIN
    SELECT count(*) INTO _Found
    FROM information_schema.columns
    WHERE "table_schema" = 'dbo'
        AND "table_name" IN ('CreditCards', 'BankAccounts')
        AND "column_name" = 'Number';
    PERFORM "test"."AssertEquals"(_Found, 2::bigint, 'the encrypted number columns are not where this test expects them');

    PERFORM "test"."AssertRaises"(
        'SELECT "Methods"."Number" FROM "dbo"."GetPaymentMethods"(''member'') AS "Methods"',
        'GetPaymentMethods is handing out the stored number'
    );
END;
$$ LANGUAGE plpgsql;
