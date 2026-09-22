--
-- A card somebody has saved to pay with. One row per card, and a person may
-- save several; which one is used by default is "IsDefault", which is shared
-- with dbo.BankAccounts -- see below.
--
-- **"Number" is a placeholder and is meant to be deleted.** Holding a card
-- number at all is something an application does only until a payment
-- processor is wired up, at which point this column becomes the processor's
-- token and the number stops crossing this boundary. Until then it is stored
-- encrypted -- pgcrypto's pgp_sym_encrypt, under a key dbo.AddCreditCard is
-- handed by the caller and that this database never stores -- so the column is
-- bytea rather than text and a dump of this table is not a list of card
-- numbers. Nothing reads it back: there is no function that decrypts it, and
-- the only thing any reader is shown is "Last4".
--
-- There is deliberately **no column for the security code**. The form asks
-- for one because a card cannot be authorised without it, and main-api checks
-- its shape and drops it. Storing it is forbidden outright, not merely unwise,
-- so the place it would go does not exist.
--
-- "Brand" is derived from the number by dbo.AddCreditCard rather than asked
-- for: the first digits of a card say which network issued it, and a person
-- choosing "Visa" from a list for a Mastercard number would be recording their
-- own mistake. "Other" is what an unrecognised prefix reads as -- a network
-- this list has not heard of is still a card.
--
-- The billing address is this card's, not the person's. dbo.UserProfiles
-- carries one address for the human being; a card is billed wherever its
-- statement goes, which is frequently somewhere else.
--
-- **At most one default per person, across this table and dbo.BankAccounts.**
-- No constraint enforces that, because the two rows it would have to compare
-- are in different tables. dbo.SetDefaultPaymentMethod clears both tables
-- before it sets one, and dbo.AddCreditCard, dbo.AddBankAccount and
-- dbo.RemovePaymentMethod each keep the invariant; writing "IsDefault" by hand
-- breaks it. See sql/Tests/Cases/SetDefaultPaymentMethod.sql.
--
CREATE TABLE "dbo"."CreditCards" (
    "CreditCardUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "UserUUID" uuid NOT NULL,
    -- Derived from "Number", never asked for. Constrained to the four networks
    -- this schema can recognise, plus the answer for the ones it cannot.
    "Brand" varchar(20) NOT NULL DEFAULT 'Other',
    "NameOnCard" varchar(64) NOT NULL DEFAULT '',
    -- Encrypted, write-only, and on its way out. See the note above.
    "Number" bytea NOT NULL,
    -- The only part of the number anything is allowed to show, kept in the
    -- clear because every reader needs it and four digits identify nothing.
    "Last4" varchar(4) NOT NULL,
    -- A month, not a day: a card expires at the end of the month printed on
    -- it, so there is no day to store and inventing one would be a lie about
    -- when it stops working.
    "ExpirationMonth" smallint NOT NULL,
    "ExpirationYear" smallint NOT NULL,
    "BillingLine1" varchar(255) NOT NULL DEFAULT '',
    "BillingCity" varchar(64) NOT NULL DEFAULT '',
    "BillingState" varchar(64) NOT NULL DEFAULT '',
    "BillingPostalCode" varchar(16) NOT NULL DEFAULT '',
    "BillingCountry" varchar(64) NOT NULL DEFAULT '',
    "IsDefault" boolean NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "CreditCards_Brand_Check" CHECK ("Brand" IN ('American Express', 'Discover', 'Mastercard', 'Visa', 'Other')),
    CONSTRAINT "CreditCards_ExpirationMonth_Check" CHECK ("ExpirationMonth" BETWEEN 1 AND 12),
    -- A two-digit year on a card is this century. The floor is not a date this
    -- product existed at -- it is the point below which the value has to be a
    -- typo rather than an expiry.
    CONSTRAINT "CreditCards_ExpirationYear_Check" CHECK ("ExpirationYear" BETWEEN 2000 AND 2099),
    CONSTRAINT "CreditCards_Last4_Check" CHECK ("Last4" ~ '^[0-9]{4}$')
);
