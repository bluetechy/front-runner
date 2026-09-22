--
-- Three saved methods for 'member' -- two cards and a bank account -- added in
-- the order First, Second, Third and spread an hour apart in time.
--
-- The spreading is the reason this exists. CURRENT_TIMESTAMP does not move
-- inside a transaction and every test runs in one, so three methods saved by a
-- test are all saved at the same instant; dbo.GetPaymentMethods then has
-- nothing to order on but its UUID tiebreak, which is random, and a test of
-- the ordering would pass or fail by chance. See apps/main-db/CLAUDE.md.
--
-- Backdated by name rather than by row order, because the two tables have to
-- interleave: Third is the newest and is the bank account, so anything that
-- numbered each table separately would put it level with Second.
--
-- The mix is deliberate. A wallet's order, and the default that moves through
-- it, both span the two tables, so a fixture of three cards would not exercise
-- the thing these tests are about.
--
CREATE FUNCTION "test"."FillWallet" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."AddCreditCard"('member', 'First', '4111111111111111', 4::smallint,
        (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint, '', '', '', '', '', 'test-key');
    PERFORM "dbo"."AddCreditCard"('member', 'Second', '5555555555554444', 4::smallint,
        (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint, '', '', '', '', '', 'test-key');
    PERFORM "dbo"."AddBankAccount"('member', 'Third', 'Checking', '021000021', '000123456789', 'test-key');

    UPDATE "dbo"."CreditCards" SET "CreatedAt" = CURRENT_TIMESTAMP - interval '3 hours' WHERE "CreditCards"."NameOnCard" = 'First';
    UPDATE "dbo"."CreditCards" SET "CreatedAt" = CURRENT_TIMESTAMP - interval '2 hours' WHERE "CreditCards"."NameOnCard" = 'Second';
    UPDATE "dbo"."BankAccounts" SET "CreatedAt" = CURRENT_TIMESTAMP - interval '1 hour' WHERE "BankAccounts"."NameOnAccount" = 'Third';
END;
$$ LANGUAGE plpgsql;
