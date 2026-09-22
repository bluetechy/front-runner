--
-- Everything one person has saved to pay with: their cards and their bank
-- accounts, in one list.
--
-- One function rather than a GetCreditCards and a GetBankAccounts, because a
-- wallet is one list with one default in it. Asking twice and merging in the
-- caller would put the ordering, and the question of which of the two answers
-- holds the default, in every caller that ever reads a wallet.
--
-- The price is a row shape that is the union of two things, so the columns
-- only one kind has are NULL on the other: a bank account has no expiry, a
-- card has no routing number. "Kind" says which row you are holding and is
-- the first thing a reader should branch on. Nothing here is NULL because it
-- was not answered -- the tables have no nullable text columns -- so a NULL is
-- always "this kind does not have that".
--
-- "Number" is not among the columns and never will be. It is stored encrypted
-- and write-only; "Last4" is what a wallet is allowed to show. See
-- sql/Tables/CreditCards.sql.
--
-- "IsExpired" is computed rather than stored, because it is a fact about today
-- rather than about the card: a card expires at the end of the month printed
-- on it, so it is good through the last day of that month.
--
-- Newest first, by when it was saved. The default is **not** sorted to the
-- top: choosing one is a change to which method pays, not to where it sits,
-- and a list that rearranged itself under the cursor that clicked it would
-- make the person check what they had just done. So the only thing that moves
-- a row is adding or removing one.
--
-- "CreatedAt" rather than an expiry: the order is the order they were added
-- in, which is the one the person remembers. Ties break on the UUID, which is
-- arbitrary but stable -- two methods share a "CreatedAt" only when one
-- transaction saved both, and the list has to come back the same way twice.
--
CREATE FUNCTION "dbo"."GetPaymentMethods" (_LoginName varchar(64)) RETURNS TABLE(
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
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        -- An account that does not exist has an empty wallet rather than an
        -- error: there is nothing secret in "you have saved nothing".
        IF _UserUUID IS NULL THEN
            RETURN;
        END IF;

        RETURN QUERY
        SELECT * FROM (
            SELECT
                'CreditCard'::varchar(16),
                "CreditCards"."CreditCardUUID",
                "CreditCards"."NameOnCard",
                "CreditCards"."Last4",
                "CreditCards"."Brand",
                "CreditCards"."ExpirationMonth",
                "CreditCards"."ExpirationYear",
                -- Good through the last day of the month printed on it.
                (make_date("CreditCards"."ExpirationYear", "CreditCards"."ExpirationMonth", 1) + interval '1 month')::date <= CURRENT_DATE,
                NULL::varchar(20),
                NULL::varchar(9),
                "CreditCards"."BillingLine1",
                "CreditCards"."BillingCity",
                "CreditCards"."BillingState",
                "CreditCards"."BillingPostalCode",
                "CreditCards"."BillingCountry",
                "CreditCards"."IsDefault",
                "CreditCards"."CreatedAt"
            FROM "dbo"."CreditCards"
            WHERE "CreditCards"."UserUUID" = _UserUUID

            UNION ALL

            SELECT
                'BankAccount'::varchar(16),
                "BankAccounts"."BankAccountUUID",
                "BankAccounts"."NameOnAccount",
                "BankAccounts"."Last4",
                NULL::varchar(20),
                NULL::smallint,
                NULL::smallint,
                -- A bank account does not expire. False rather than NULL: a
                -- reader asking "is this unusable" gets an answer for every
                -- row, and NULL there would read as "we do not know".
                false,
                "BankAccounts"."AccountType",
                "BankAccounts"."RoutingNumber",
                NULL::varchar(255),
                NULL::varchar(64),
                NULL::varchar(64),
                NULL::varchar(16),
                NULL::varchar(64),
                "BankAccounts"."IsDefault",
                "BankAccounts"."CreatedAt"
            FROM "dbo"."BankAccounts"
            WHERE "BankAccounts"."UserUUID" = _UserUUID
        ) AS "Methods" ("Kind", "PaymentMethodUUID", "NameOnMethod", "Last4", "Brand",
            "ExpirationMonth", "ExpirationYear", "IsExpired", "AccountType", "RoutingNumber",
            "BillingLine1", "BillingCity", "BillingState", "BillingPostalCode", "BillingCountry",
            "IsDefault", "CreatedAt")
        ORDER BY "Methods"."CreatedAt" DESC, "Methods"."PaymentMethodUUID";
    END;
$$ LANGUAGE plpgsql;
