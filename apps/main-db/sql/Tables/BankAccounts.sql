--
-- A bank account somebody has saved to pay from. The other half of the wallet;
-- everything the header comment on dbo.CreditCards says about "Number",
-- "Last4" and "IsDefault" is true here too, including that the two tables
-- share one default between them.
--
-- "RoutingNumber" is **not** encrypted, and that is not an oversight. A
-- routing number names a bank, not an account -- every customer of that bank
-- has the same one, and they are published in a directory anybody can read.
-- Encrypting it would hide nothing and would cost the ability to say which
-- bank an account is at.
--
-- "NameOnAccount" has no empty default, unlike every text column on
-- dbo.UserProfiles. A profile field nobody filled in is a question that was
-- not answered; an account with no name on it is not an account, and the bank
-- would refuse it.
--
-- There is no verification here. The mock-up this was built from promises a
-- test deposit of under a dollar within three business days, which is a real
-- mechanism belonging to a payment processor -- so a row in this table means
-- "somebody typed these details", not "this account exists and is theirs".
-- Whatever ends up doing that verification adds the column that records it.
--
CREATE TABLE "dbo"."BankAccounts" (
    "BankAccountUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "UserUUID" uuid NOT NULL,
    "NameOnAccount" varchar(64) NOT NULL,
    "AccountType" varchar(20) NOT NULL DEFAULT 'Checking',
    -- Nine digits, and the bank's rather than the customer's -- see above.
    "RoutingNumber" varchar(9) NOT NULL,
    -- Encrypted, write-only, and on its way out. See dbo.CreditCards.
    "Number" bytea NOT NULL,
    "Last4" varchar(4) NOT NULL,
    "IsDefault" boolean NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "BankAccounts_AccountType_Check" CHECK ("AccountType" IN ('Checking', 'Savings')),
    CONSTRAINT "BankAccounts_RoutingNumber_Check" CHECK ("RoutingNumber" ~ '^[0-9]{9}$'),
    CONSTRAINT "BankAccounts_Last4_Check" CHECK ("Last4" ~ '^[0-9]{4}$')
);
