--
-- The one default a wallet has, and the fact that it is one default across two
-- tables. No constraint can say that, so these are what hold it.
--

-- The first thing saved is the default, because a wallet with something in it
-- and nothing chosen has no answer to "which one pays".
CREATE FUNCTION "test"."TestSetDefaultPaymentMethod_TheFirstMethodSavedIsTheDefault" () RETURNS void AS $$
DECLARE
    _Saved record;
    _Defaults bigint;
BEGIN
    SELECT * INTO _Saved FROM "dbo"."AddCreditCard"('member', 'First', '4111111111111111', 4::smallint,
        (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint, '', '', '', '', '', 'test-key') AS "Methods" LIMIT 1;
    PERFORM "test"."AssertTrue"(_Saved."IsDefault", 'the first card saved did not become the default');

    PERFORM "dbo"."AddCreditCard"('member', 'Second', '5555555555554444', 4::smallint,
        (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint, '', '', '', '', '', 'test-key');
    PERFORM "dbo"."AddBankAccount"('member', 'Third', 'Checking', '021000021', '000123456789', 'test-key');

    SELECT count(*) INTO _Defaults FROM "dbo"."GetPaymentMethods"('member') AS "Methods" WHERE "Methods"."IsDefault";
    PERFORM "test"."AssertEquals"(_Defaults, 1::bigint, 'adding to a wallet changed how many defaults it has');
END;
$$ LANGUAGE plpgsql;

-- The invariant this function exists for: choosing a bank account has to clear
-- the card, and the two rows are in different tables.
CREATE FUNCTION "test"."TestSetDefaultPaymentMethod_MovesTheDefaultAcrossBothTables" () RETURNS void AS $$
DECLARE
    _Account uuid;
    _Chosen record;
    _Defaults bigint;
BEGIN
    PERFORM "dbo"."AddCreditCard"('member', 'Card', '4111111111111111', 4::smallint,
        (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint, '', '', '', '', '', 'test-key');
    SELECT "Methods"."PaymentMethodUUID" INTO _Account
    FROM "dbo"."AddBankAccount"('member', 'Account', 'Checking', '021000021', '000123456789', 'test-key') AS "Methods"
    WHERE "Methods"."Kind" = 'BankAccount';

    PERFORM "dbo"."SetDefaultPaymentMethod"('member', 'BankAccount'::varchar(16), _Account);

    SELECT * INTO _Chosen FROM "dbo"."GetPaymentMethods"('member') AS "Methods" WHERE "Methods"."IsDefault";
    PERFORM "test"."AssertEquals"(_Chosen."Kind"::text, 'BankAccount', 'the bank account did not become the default');

    SELECT count(*) INTO _Defaults FROM "dbo"."GetPaymentMethods"('member') AS "Methods" WHERE "Methods"."IsDefault";
    PERFORM "test"."AssertEquals"(_Defaults, 1::bigint, 'the card in the other table kept the default as well');
END;
$$ LANGUAGE plpgsql;

-- Refused with the schema's authorization message rather than a "no such
-- method", which would confirm that somebody else's card exists.
CREATE FUNCTION "test"."TestSetDefaultPaymentMethod_RefusesSomebodyElsesMethod" () RETURNS void AS $$
DECLARE
    _Card uuid;
BEGIN
    SELECT "Methods"."PaymentMethodUUID" INTO _Card
    FROM "dbo"."AddCreditCard"('owner', 'Olivia Owner', '4111111111111111', 4::smallint,
        (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint, '', '', '', '', '', 'test-key') AS "Methods"
    LIMIT 1;

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."SetDefaultPaymentMethod"(%L, %L, %L)', 'member', 'CreditCard', _Card),
        'one account set another account''s card as its default',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

-- The kind is asked for so a UUID from the wrong table is refused rather than
-- quietly matching nothing.
CREATE FUNCTION "test"."TestSetDefaultPaymentMethod_RefusesAUUIDFromTheWrongTable" () RETURNS void AS $$
DECLARE
    _Card uuid;
BEGIN
    SELECT "Methods"."PaymentMethodUUID" INTO _Card
    FROM "dbo"."AddCreditCard"('member', 'Card', '4111111111111111', 4::smallint,
        (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint, '', '', '', '', '', 'test-key') AS "Methods"
    LIMIT 1;

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."SetDefaultPaymentMethod"(%L, %L, %L)', 'member', 'BankAccount', _Card),
        'a card was accepted as a bank account',
        'Action cannot be performed.'
    );

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."SetDefaultPaymentMethod"(%L, %L, %L)', 'member', 'Cheque', _Card),
        'a kind of payment method that does not exist was accepted',
        'CreditCard or a BankAccount'
    );
END;
$$ LANGUAGE plpgsql;
