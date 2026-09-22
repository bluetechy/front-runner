--
-- Taking a method out of the wallet, and what happens to the default when the
-- default is the one that goes.
--

CREATE FUNCTION "test"."TestRemovePaymentMethod_TakesTheMethodOutOfTheWallet" () RETURNS void AS $$
DECLARE
    _Card uuid;
    _Left bigint;
BEGIN
    PERFORM "dbo"."AddCreditCard"('member', 'Keep', '4111111111111111', 4::smallint,
        (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint, '', '', '', '', '', 'test-key');
    SELECT "Methods"."PaymentMethodUUID" INTO _Card
    FROM "dbo"."AddCreditCard"('member', 'Drop', '5555555555554444', 4::smallint,
        (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint, '', '', '', '', '', 'test-key') AS "Methods"
    WHERE "Methods"."NameOnMethod" = 'Drop';

    SELECT count(*) INTO _Left FROM "dbo"."RemovePaymentMethod"('member', 'CreditCard'::varchar(16), _Card);
    PERFORM "test"."AssertEquals"(_Left, 1::bigint, 'removing one of two cards did not leave one');

    SELECT count(*) INTO _Left FROM "dbo"."CreditCards" WHERE "CreditCards"."CreditCardUUID" = _Card;
    PERFORM "test"."AssertEquals"(_Left, 0::bigint, 'the removed card is still in the table');
END;
$$ LANGUAGE plpgsql;

-- A wallet with something in it and nothing chosen has no answer to "which one
-- pays", so removing the default promotes the oldest of what is left -- which
-- may be in the other table, and which is the *bottom* of the list the reader
-- returns rather than the top. Those are two different questions: what a
-- person sees first, and what has been theirs longest.
CREATE FUNCTION "test"."TestRemovePaymentMethod_PromotesTheOldestRemainingMethod" () RETURNS void AS $$
DECLARE
    _First record;
    _Chosen record;
    _Defaults bigint;
BEGIN
    PERFORM "test"."FillWallet"();

    -- First was added first, so it holds the default already.
    SELECT * INTO _First FROM "dbo"."GetPaymentMethods"('member') AS "Methods"
    WHERE "Methods"."NameOnMethod" = 'First';
    PERFORM "test"."AssertTrue"(_First."IsDefault", 'the oldest method was not the default to begin with');

    PERFORM "dbo"."RemovePaymentMethod"('member', _First."Kind", _First."PaymentMethodUUID");

    SELECT * INTO _Chosen FROM "dbo"."GetPaymentMethods"('member') AS "Methods" WHERE "Methods"."IsDefault";
    PERFORM "test"."AssertEquals"(_Chosen."NameOnMethod"::text, 'Second', 'removing the default did not promote the oldest of what was left');

    SELECT count(*) INTO _Defaults FROM "dbo"."GetPaymentMethods"('member') AS "Methods" WHERE "Methods"."IsDefault";
    PERFORM "test"."AssertEquals"(_Defaults, 1::bigint, 'the promotion left the wallet with the wrong number of defaults');
END;
$$ LANGUAGE plpgsql;

-- The promotion crosses into the other table when the oldest thing left is a
-- bank account, which is the case the two-table default exists for.
CREATE FUNCTION "test"."TestRemovePaymentMethod_PromotesAcrossBothTables" () RETURNS void AS $$
DECLARE
    _Method record;
    _Chosen record;
BEGIN
    PERFORM "test"."FillWallet"();

    -- Take both cards away, oldest first, so that what is left holding the
    -- default is the bank account -- the other table.
    SELECT * INTO _Method FROM "dbo"."GetPaymentMethods"('member') AS "Methods"
    WHERE "Methods"."NameOnMethod" = 'First';
    PERFORM "dbo"."RemovePaymentMethod"('member', _Method."Kind", _Method."PaymentMethodUUID");

    SELECT * INTO _Method FROM "dbo"."GetPaymentMethods"('member') AS "Methods"
    WHERE "Methods"."NameOnMethod" = 'Second';
    PERFORM "dbo"."RemovePaymentMethod"('member', _Method."Kind", _Method."PaymentMethodUUID");

    SELECT * INTO _Chosen FROM "dbo"."GetPaymentMethods"('member') AS "Methods" WHERE "Methods"."IsDefault";
    PERFORM "test"."AssertEquals"(_Chosen."Kind"::text, 'BankAccount', 'the default did not cross into the other table');
    PERFORM "test"."AssertEquals"(_Chosen."NameOnMethod"::text, 'Third', 'the last method left did not take the default');
END;
$$ LANGUAGE plpgsql;

-- Removing a method that was not the default leaves the default where it is.
CREATE FUNCTION "test"."TestRemovePaymentMethod_LeavesTheDefaultAloneWhenItIsNotTheOneRemoved" () RETURNS void AS $$
DECLARE
    _Second uuid;
    _Chosen record;
BEGIN
    PERFORM "dbo"."AddCreditCard"('member', 'First', '4111111111111111', 4::smallint,
        (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint, '', '', '', '', '', 'test-key');
    SELECT "Methods"."PaymentMethodUUID" INTO _Second
    FROM "dbo"."AddCreditCard"('member', 'Second', '5555555555554444', 4::smallint,
        (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint, '', '', '', '', '', 'test-key') AS "Methods"
    WHERE "Methods"."NameOnMethod" = 'Second';

    PERFORM "dbo"."RemovePaymentMethod"('member', 'CreditCard'::varchar(16), _Second);

    SELECT * INTO _Chosen FROM "dbo"."GetPaymentMethods"('member') AS "Methods" WHERE "Methods"."IsDefault";
    PERFORM "test"."AssertEquals"(_Chosen."NameOnMethod"::text, 'First', 'removing a second card moved the default');
END;
$$ LANGUAGE plpgsql;

-- An empty wallet has no default and needs none, so emptying one is not a
-- special case that has to find something to promote.
CREATE FUNCTION "test"."TestRemovePaymentMethod_LeavesAnEmptyWalletWithNoDefault" () RETURNS void AS $$
DECLARE
    _Only uuid;
    _Left bigint;
BEGIN
    SELECT "Methods"."PaymentMethodUUID" INTO _Only
    FROM "dbo"."AddCreditCard"('member', 'Only', '4111111111111111', 4::smallint,
        (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint, '', '', '', '', '', 'test-key') AS "Methods"
    LIMIT 1;

    SELECT count(*) INTO _Left FROM "dbo"."RemovePaymentMethod"('member', 'CreditCard'::varchar(16), _Only);
    PERFORM "test"."AssertEquals"(_Left, 0::bigint, 'removing the only method did not empty the wallet');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestRemovePaymentMethod_RefusesSomebodyElsesMethod" () RETURNS void AS $$
DECLARE
    _Card uuid;
    _Still bigint;
BEGIN
    SELECT "Methods"."PaymentMethodUUID" INTO _Card
    FROM "dbo"."AddCreditCard"('owner', 'Olivia Owner', '4111111111111111', 4::smallint,
        (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint, '', '', '', '', '', 'test-key') AS "Methods"
    LIMIT 1;

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."RemovePaymentMethod"(%L, %L, %L)', 'member', 'CreditCard', _Card),
        'one account removed another account''s card',
        'Action cannot be performed.'
    );

    SELECT count(*) INTO _Still FROM "dbo"."CreditCards" WHERE "CreditCards"."CreditCardUUID" = _Card;
    PERFORM "test"."AssertEquals"(_Still, 1::bigint, 'the refused removal deleted the card anyway');
END;
$$ LANGUAGE plpgsql;
