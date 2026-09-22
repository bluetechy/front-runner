--
-- Save a card to the signed-in person's wallet.
--
-- The number arrives as typed -- spaces and dashes and all -- and three things
-- are made of it here: the digits are encrypted into "Number", the last four
-- are kept in the clear as "Last4", and the first few decide "Brand". Only the
-- middle of it is secret, and only the middle of it is thrown away.
--
-- _EncryptionKey is the caller's, held in main-api's environment and never
-- written down here. That is the whole of the key management, and it is the
-- reason this is a placeholder: a key that travels in every call is a key that
-- appears in a statement log the moment one is turned on. It buys exactly one
-- thing, which is that a stolen dump of dbo.CreditCards is not a list of card
-- numbers, and it is meant to be deleted along with the column when a payment
-- processor is wired up. See sql/Tables/CreditCards.sql.
--
-- **No security code is taken and none is stored.** Storing one is forbidden
-- rather than merely unwise, so this function has nowhere to put it and does
-- not ask. main-api checks the shape of the one the form collects and drops it.
--
-- Shape only is checked here -- digits, a month that is a month, a card that
-- has not already expired. Whether the number could be a real card is
-- main-api's business, which is where the Luhn check is; see wallet.schema.ts.
--
-- Returns the whole wallet rather than the row it wrote. Every write function
-- in this group does: adding the first card makes it the default, removing the
-- default promotes another, and a caller that was handed one row would have to
-- guess which of the others had changed underneath it.
--
CREATE FUNCTION "dbo"."AddCreditCard" (
    _LoginName varchar(64),
    _NameOnCard varchar(64),
    _Number text,
    _ExpirationMonth smallint,
    _ExpirationYear smallint,
    _BillingLine1 varchar(255),
    _BillingCity varchar(64),
    _BillingState varchar(64),
    _BillingPostalCode varchar(16),
    _BillingCountry varchar(64),
    _EncryptionKey text
) RETURNS TABLE(
    "Kind" varchar(16),
    "PaymentMethodUUID" uuid,
    "NameOnMethod" varchar(64),
    "Last4" varchar(4),
    "Brand" varchar(20),
    "ExpirationMonth" smallint,
    "ExpirationYear" smallint,
    "IsExpired" boolean,
    "AccountType" varchar(20),
    "RoutingNumber" varchar(9),
    "BillingLine1" varchar(255),
    "BillingCity" varchar(64),
    "BillingState" varchar(64),
    "BillingPostalCode" varchar(16),
    "BillingCountry" varchar(64),
    "IsDefault" boolean,
    "CreatedAt" TIMESTAMPTZ
) AS $$
    DECLARE
        _UserUUID uuid;
        _Digits text;
        _Brand varchar(20);
        _IsFirst boolean;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;
        IF _EncryptionKey IS NULL OR btrim(_EncryptionKey) = '' THEN
            RAISE EXCEPTION 'A card cannot be stored without an encryption key.';
        END IF;

        -- What a person types into a card field has the groups separated the
        -- way they are printed on the card. The separators are presentation.
        _Digits := regexp_replace(COALESCE(_Number, ''), '[\s-]', '', 'g');
        IF _Digits !~ '^[0-9]{12,19}$' THEN
            RAISE EXCEPTION 'A card number is between 12 and 19 digits.';
        END IF;

        -- The issuer identification number, which is the first one to six
        -- digits. Approximate on purpose: these ranges move, and the answer
        -- decides which logo is drawn beside the card rather than whether the
        -- payment works. An unrecognised prefix is still a card.
        _Brand := CASE
            WHEN _Digits ~ '^4' THEN 'Visa'
            WHEN _Digits ~ '^(5[1-5]|2(22[1-9]|2[3-9][0-9]|[3-6][0-9][0-9]|7[01][0-9]|720))' THEN 'Mastercard'
            WHEN _Digits ~ '^3[47]' THEN 'American Express'
            WHEN _Digits ~ '^(6011|65|64[4-9])' THEN 'Discover'
            ELSE 'Other'
        END;

        IF _ExpirationMonth IS NULL OR _ExpirationMonth < 1 OR _ExpirationMonth > 12 THEN
            RAISE EXCEPTION 'An expiry month is a number from 1 to 12.';
        END IF;
        IF _ExpirationYear IS NULL OR _ExpirationYear < 2000 OR _ExpirationYear > 2099 THEN
            RAISE EXCEPTION 'An expiry year is written in full, as 2029.';
        END IF;
        -- A card is good through the last day of the month printed on it. A
        -- card that expired last month can still be in the wallet -- it
        -- expired while it sat there -- but it cannot be added today.
        IF (make_date(_ExpirationYear, _ExpirationMonth, 1) + interval '1 month')::date <= CURRENT_DATE THEN
            RAISE EXCEPTION 'That card has already expired.';
        END IF;

        -- The first thing in an empty wallet is the default, because a wallet
        -- with something in it and nothing chosen has no answer to "which one".
        _IsFirst := NOT EXISTS (SELECT 1 FROM "dbo"."CreditCards" WHERE "CreditCards"."UserUUID" = _UserUUID)
            AND NOT EXISTS (SELECT 1 FROM "dbo"."BankAccounts" WHERE "BankAccounts"."UserUUID" = _UserUUID);

        INSERT INTO "dbo"."CreditCards" (
            "UserUUID", "Brand", "NameOnCard", "Number", "Last4",
            "ExpirationMonth", "ExpirationYear",
            "BillingLine1", "BillingCity", "BillingState", "BillingPostalCode", "BillingCountry",
            "IsDefault", "CreatedBy"
        )
        VALUES (
            _UserUUID,
            _Brand,
            btrim(COALESCE(_NameOnCard, '')),
            public.pgp_sym_encrypt(_Digits, _EncryptionKey),
            right(_Digits, 4),
            _ExpirationMonth,
            _ExpirationYear,
            btrim(COALESCE(_BillingLine1, '')),
            btrim(COALESCE(_BillingCity, '')),
            btrim(COALESCE(_BillingState, '')),
            btrim(COALESCE(_BillingPostalCode, '')),
            btrim(COALESCE(_BillingCountry, '')),
            _IsFirst,
            _LoginName
        );

        RETURN QUERY SELECT * FROM "dbo"."GetPaymentMethods"(_LoginName);
    END;
$$ LANGUAGE plpgsql;
