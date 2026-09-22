--
-- Choose which saved method pays by default.
--
-- The default is one thing spread over two tables, so it cannot be a
-- constraint: no unique index can compare a row in dbo.CreditCards with a row
-- in dbo.BankAccounts. This function is what makes it true instead -- it
-- clears the flag on both tables and then sets exactly one, in one statement
-- each, inside the caller's transaction. Writing "IsDefault" by hand goes
-- round it and leaves a wallet with two defaults or none.
--
-- _Kind names which table the UUID is in. It could be found by looking in
-- both, and is asked for anyway: a caller reading a wallet already holds it,
-- and requiring it means a UUID from the wrong table is refused rather than
-- quietly matching nothing.
--
-- A method belonging to somebody else is refused with the schema's
-- authorization message rather than a "no such method", which would confirm
-- that it exists.
--
CREATE FUNCTION "dbo"."SetDefaultPaymentMethod" (
    _LoginName varchar(64),
    _Kind varchar(16),
    _PaymentMethodUUID uuid
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
        _Owned boolean;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;
        IF _Kind IS NULL OR _Kind NOT IN ('CreditCard', 'BankAccount') THEN
            RAISE EXCEPTION 'A payment method is a CreditCard or a BankAccount.';
        END IF;

        IF _Kind = 'CreditCard' THEN
            _Owned := EXISTS (SELECT 1 FROM "dbo"."CreditCards"
                WHERE "CreditCards"."CreditCardUUID" = _PaymentMethodUUID
                    AND "CreditCards"."UserUUID" = _UserUUID);
        ELSE
            _Owned := EXISTS (SELECT 1 FROM "dbo"."BankAccounts"
                WHERE "BankAccounts"."BankAccountUUID" = _PaymentMethodUUID
                    AND "BankAccounts"."UserUUID" = _UserUUID);
        END IF;
        IF NOT _Owned THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        -- Only the rows that are actually set: an UPDATE touching every method
        -- would move "UpdatedAt" on cards nobody changed.
        UPDATE "dbo"."CreditCards" SET "IsDefault" = false, "UpdatedBy" = _LoginName
        WHERE "CreditCards"."UserUUID" = _UserUUID AND "CreditCards"."IsDefault";

        UPDATE "dbo"."BankAccounts" SET "IsDefault" = false, "UpdatedBy" = _LoginName
        WHERE "BankAccounts"."UserUUID" = _UserUUID AND "BankAccounts"."IsDefault";

        IF _Kind = 'CreditCard' THEN
            UPDATE "dbo"."CreditCards" SET "IsDefault" = true, "UpdatedBy" = _LoginName
            WHERE "CreditCards"."CreditCardUUID" = _PaymentMethodUUID;
        ELSE
            UPDATE "dbo"."BankAccounts" SET "IsDefault" = true, "UpdatedBy" = _LoginName
            WHERE "BankAccounts"."BankAccountUUID" = _PaymentMethodUUID;
        END IF;

        RETURN QUERY SELECT * FROM "dbo"."GetPaymentMethods"(_LoginName);
    END;
$$ LANGUAGE plpgsql;
