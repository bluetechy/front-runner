--
-- Take a saved card or bank account out of the wallet.
--
-- A real delete, not a flag. Nothing in this schema refers to a payment
-- method, so there is no history to keep intact and no reader that would be
-- left pointing at a row that is meant to be gone -- and a wallet is a list of
-- what you can pay with, so a removed card that is still in the table is a
-- card that is still in the wallet. When something does start referring to a
-- method -- a payment, a subscription -- this becomes a flag and the readers
-- start filtering it, the way dbo.Organizations."IsEnabled" works.
--
-- **Removing the default promotes the oldest remaining method.** The
-- alternative is a wallet with something in it and nothing chosen, which has
-- no answer to "which one pays"; the oldest is the one the person has had
-- longest rather than the one they happened to add last. An empty wallet has
-- no default and needs none.
--
-- The mock-up this was built from greys out a card with payments pending and
-- says it cannot be removed. There are no payments in this schema yet, so
-- there is nothing to check and every method can be removed. Whatever adds
-- payments adds that guard here.
--
CREATE FUNCTION "dbo"."RemovePaymentMethod" (
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
        _WasDefault boolean;
        _NextKind varchar(16);
        _NextUUID uuid;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;
        IF _Kind IS NULL OR _Kind NOT IN ('CreditCard', 'BankAccount') THEN
            RAISE EXCEPTION 'A payment method is a CreditCard or a BankAccount.';
        END IF;

        -- The delete is its own ownership check: it is filtered on the account
        -- as well as on the method, so a UUID belonging to somebody else
        -- removes nothing and is answered the same way a missing one is.
        IF _Kind = 'CreditCard' THEN
            DELETE FROM "dbo"."CreditCards"
            WHERE "CreditCards"."CreditCardUUID" = _PaymentMethodUUID
                AND "CreditCards"."UserUUID" = _UserUUID
            RETURNING "CreditCards"."IsDefault" INTO _WasDefault;
        ELSE
            DELETE FROM "dbo"."BankAccounts"
            WHERE "BankAccounts"."BankAccountUUID" = _PaymentMethodUUID
                AND "BankAccounts"."UserUUID" = _UserUUID
            RETURNING "BankAccounts"."IsDefault" INTO _WasDefault;
        END IF;
        IF _WasDefault IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        -- Ordered here rather than taken from the top of the reader's list.
        -- dbo.GetPaymentMethods answers newest first, which is a decision
        -- about how a wallet is displayed; which method inherits the default
        -- is a different question with a different answer, and tying the two
        -- together would silently change this the next time the display order
        -- did. The tiebreak matches the reader's so the choice is stable.
        IF _WasDefault THEN
            SELECT "Methods"."Kind", "Methods"."PaymentMethodUUID"
            INTO _NextKind, _NextUUID
            FROM "dbo"."GetPaymentMethods"(_LoginName) AS "Methods"
            ORDER BY "Methods"."CreatedAt", "Methods"."PaymentMethodUUID"
            LIMIT 1;

            IF _NextKind = 'CreditCard' THEN
                UPDATE "dbo"."CreditCards" SET "IsDefault" = true, "UpdatedBy" = _LoginName
                WHERE "CreditCards"."CreditCardUUID" = _NextUUID;
            ELSIF _NextKind = 'BankAccount' THEN
                UPDATE "dbo"."BankAccounts" SET "IsDefault" = true, "UpdatedBy" = _LoginName
                WHERE "BankAccounts"."BankAccountUUID" = _NextUUID;
            END IF;
        END IF;

        RETURN QUERY SELECT * FROM "dbo"."GetPaymentMethods"(_LoginName);
    END;
$$ LANGUAGE plpgsql;
