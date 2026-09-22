--
-- Saving a card: what is derived from the number, what is refused, and what
-- happens to the number itself.
--

-- A test card number per network, so the brand table is exercised by the thing
-- it actually reads rather than by a made-up prefix.
CREATE FUNCTION "test"."TestAddCreditCard_DerivesTheBrandFromTheNumber" () RETURNS void AS $$
DECLARE
    _Case record;
    _Saved record;
BEGIN
    FOR _Case IN SELECT * FROM (VALUES
        ('4111111111111111', 'Visa'),
        ('5555555555554444', 'Mastercard'),
        ('2221001234567890', 'Mastercard'),
        ('378282246310005',  'American Express'),
        ('6011111111111117', 'Discover'),
        ('3056930009020004', 'Other')
    ) AS "Cards" ("Number", "Brand") LOOP
        SELECT * INTO _Saved FROM "dbo"."AddCreditCard"(
            'member', 'Marcus Member', _Case."Number", 4::smallint,
            (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint,
            '', '', '', '', '', 'test-key'
        ) AS "Methods" WHERE "Methods"."Last4" = right(_Case."Number", 4);

        PERFORM "test"."AssertEquals"(_Saved."Brand"::text, _Case."Brand", format('%s was read as the wrong brand', _Case."Number"));
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- The separators a card is printed with are presentation, and a person typing
-- them in is reading their card correctly.
CREATE FUNCTION "test"."TestAddCreditCard_ReadsANumberThroughItsSeparators" () RETURNS void AS $$
DECLARE
    _Saved record;
BEGIN
    SELECT * INTO _Saved FROM "dbo"."AddCreditCard"(
        'member', 'Marcus Member', ' 4111 1111-1111 1111 ', 4::smallint,
        (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint,
        '', '', '', '', '', 'test-key'
    ) AS "Methods" LIMIT 1;

    PERFORM "test"."AssertEquals"(_Saved."Last4"::text, '1111', 'a spaced card number did not come back as one card');
    PERFORM "test"."AssertEquals"(_Saved."Brand"::text, 'Visa', 'a spaced card number was not read for its brand');
END;
$$ LANGUAGE plpgsql;

-- The point of the column. Nothing reads it back, so what is asserted here is
-- that what was stored is not what was typed, and that the key still opens it.
CREATE FUNCTION "test"."TestAddCreditCard_StoresTheNumberEncrypted" () RETURNS void AS $$
DECLARE
    _Stored bytea;
BEGIN
    PERFORM "dbo"."AddCreditCard"(
        'member', 'Marcus Member', '4111111111111111', 4::smallint,
        (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint,
        '', '', '', '', '', 'test-key'
    );

    SELECT "CreditCards"."Number" INTO _Stored FROM "dbo"."CreditCards"
    WHERE "CreditCards"."UserUUID" = "test"."Fixture"('User.Member');

    PERFORM "test"."AssertTrue"(
        position('4111111111111111'::bytea in _Stored) = 0,
        'the card number is sitting in the column in the clear'
    );
    PERFORM "test"."AssertEquals"(
        public.pgp_sym_decrypt(_Stored, 'test-key'),
        '4111111111111111',
        'the stored number does not decrypt back to what was saved'
    );
END;
$$ LANGUAGE plpgsql;

-- A key that travels in every call is a poor secret, but a missing one would
-- be none at all, so it is refused rather than defaulted.
CREATE FUNCTION "test"."TestAddCreditCard_RefusesToStoreWithoutAKey" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."AddCreditCard"(%L, %L, %L, 4::smallint, %s::smallint, %L, %L, %L, %L, %L, %L)',
            'member', 'Marcus Member', '4111111111111111', EXTRACT(year FROM CURRENT_DATE) + 2,
            '', '', '', '', '', ''
        ),
        'a card was stored with no encryption key',
        'encryption key'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAddCreditCard_RefusesANumberThatCannotBeACard" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."AddCreditCard"(%L, %L, %L, 4::smallint, %s::smallint, %L, %L, %L, %L, %L, %L)',
            'member', 'Marcus Member', '4111', EXTRACT(year FROM CURRENT_DATE) + 2,
            '', '', '', '', '', 'test-key'
        ),
        'a four-digit card number was accepted',
        '12 and 19 digits'
    );

    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."AddCreditCard"(%L, %L, %L, 4::smallint, %s::smallint, %L, %L, %L, %L, %L, %L)',
            'member', 'Marcus Member', '4111-XXXX-1111-1111', EXTRACT(year FROM CURRENT_DATE) + 2,
            '', '', '', '', '', 'test-key'
        ),
        'a card number with letters in it was accepted',
        '12 and 19 digits'
    );
END;
$$ LANGUAGE plpgsql;

-- A card already expired cannot be added, even though an expired card may sit
-- in a wallet -- that one expired while it was there. See GetPaymentMethods.
CREATE FUNCTION "test"."TestAddCreditCard_RefusesACardThatHasAlreadyExpired" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."AddCreditCard"(%L, %L, %L, 1::smallint, 2001::smallint, %L, %L, %L, %L, %L, %L)',
            'member', 'Marcus Member', '4111111111111111', '', '', '', '', '', 'test-key'
        ),
        'a card that expired in 2001 was added',
        'already expired'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAddCreditCard_RefusesAMonthThatIsNotAMonth" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."AddCreditCard"(%L, %L, %L, 13::smallint, %s::smallint, %L, %L, %L, %L, %L, %L)',
            'member', 'Marcus Member', '4111111111111111', EXTRACT(year FROM CURRENT_DATE) + 2,
            '', '', '', '', '', 'test-key'
        ),
        'a thirteenth month was accepted',
        '1 to 12'
    );
END;
$$ LANGUAGE plpgsql;

-- The billing address is the card's rather than the person's, so it is stored
-- beside the card and comes back with it.
CREATE FUNCTION "test"."TestAddCreditCard_KeepsTheBillingAddressWithTheCard" () RETURNS void AS $$
DECLARE
    _Saved record;
BEGIN
    SELECT * INTO _Saved FROM "dbo"."AddCreditCard"(
        'member', '  Marcus Member  ', '4111111111111111', 4::smallint,
        (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint,
        '  2896 S 9150 W  ', ' Magna ', ' UT ', ' 84044 ', ' United States ', 'test-key'
    ) AS "Methods" LIMIT 1;

    PERFORM "test"."AssertEquals"(_Saved."NameOnMethod"::text, 'Marcus Member', 'the name on the card was stored with its whitespace');
    PERFORM "test"."AssertEquals"(_Saved."BillingLine1"::text, '2896 S 9150 W', 'the billing street was stored with its whitespace');
    PERFORM "test"."AssertEquals"(_Saved."BillingCity"::text, 'Magna', 'the billing city was stored with its whitespace');
    PERFORM "test"."AssertEquals"(_Saved."BillingState"::text, 'UT', 'the billing state was stored with its whitespace');
    PERFORM "test"."AssertEquals"(_Saved."BillingPostalCode"::text, '84044', 'the billing postal code was stored with its whitespace');
    PERFORM "test"."AssertEquals"(_Saved."BillingCountry"::text, 'United States', 'the billing country was stored with its whitespace');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAddCreditCard_RefusesAnAccountThatDoesNotExist" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."AddCreditCard"(%L, %L, %L, 4::smallint, %s::smallint, %L, %L, %L, %L, %L, %L)',
            'nobody', 'Nobody', '4111111111111111', EXTRACT(year FROM CURRENT_DATE) + 2,
            '', '', '', '', '', 'test-key'
        ),
        'a card was saved to an account that does not exist',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;
