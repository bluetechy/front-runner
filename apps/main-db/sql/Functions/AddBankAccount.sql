--
-- Save a bank account to the signed-in person's wallet. The bank-account half
-- of dbo.AddCreditCard, and everything that function's header says about the
-- encryption key, about the number being a placeholder, and about returning
-- the whole wallet is true here too.
--
-- The routing number is stored in the clear and the account number is not.
-- That is the whole difference between the two: a routing number names a bank
-- and is published in a directory, an account number names an account. See
-- sql/Tables/BankAccounts.sql.
--
-- Nothing here verifies the account. The mock-up promises a test deposit of
-- under a dollar within three business days; that belongs to a payment
-- processor, and until one exists a row means somebody typed these details and
-- nothing more.
--
CREATE FUNCTION "dbo"."AddBankAccount" (
    _LoginName varchar(64),
    _NameOnAccount varchar(64),
    _AccountType varchar(20),
    _RoutingNumber text,
    _Number text,
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
        _Name varchar(64);
        _Type varchar(20);
        _Routing text;
        _Digits text;
        _IsFirst boolean;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;
        IF _EncryptionKey IS NULL OR btrim(_EncryptionKey) = '' THEN
            RAISE EXCEPTION 'An account cannot be stored without an encryption key.';
        END IF;

        -- Required, unlike every optional text field in this schema: an
        -- account with no name on it is not an account. See the table.
        _Name := btrim(COALESCE(_NameOnAccount, ''));
        IF _Name = '' THEN
            RAISE EXCEPTION 'A name on the account is required.';
        END IF;

        -- Two answers, and NULL is the form not having been changed from what
        -- it opens on rather than a refusal to say. The check constraint
        -- refuses anything else.
        _Type := COALESCE(NULLIF(btrim(_AccountType), ''), 'Checking');

        -- Both numbers arrive as typed. Separators are presentation.
        _Routing := regexp_replace(COALESCE(_RoutingNumber, ''), '[\s-]', '', 'g');
        IF _Routing !~ '^[0-9]{9}$' THEN
            RAISE EXCEPTION 'A routing number is nine digits.';
        END IF;

        _Digits := regexp_replace(COALESCE(_Number, ''), '[\s-]', '', 'g');
        IF _Digits !~ '^[0-9]{4,17}$' THEN
            RAISE EXCEPTION 'An account number is between 4 and 17 digits.';
        END IF;

        _IsFirst := NOT EXISTS (SELECT 1 FROM "dbo"."CreditCards" WHERE "CreditCards"."UserUUID" = _UserUUID)
            AND NOT EXISTS (SELECT 1 FROM "dbo"."BankAccounts" WHERE "BankAccounts"."UserUUID" = _UserUUID);

        INSERT INTO "dbo"."BankAccounts" (
            "UserUUID", "NameOnAccount", "AccountType", "RoutingNumber", "Number", "Last4",
            "IsDefault", "CreatedBy"
        )
        VALUES (
            _UserUUID,
            _Name,
            _Type,
            _Routing,
            public.pgp_sym_encrypt(_Digits, _EncryptionKey),
            right(_Digits, 4),
            _IsFirst,
            _LoginName
        );

        RETURN QUERY SELECT * FROM "dbo"."GetPaymentMethods"(_LoginName);
    END;
$$ LANGUAGE plpgsql;
