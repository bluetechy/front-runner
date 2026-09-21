--
-- Four drafts collapsed into a date window. The member's Points ledger is
-- 10 + 5 + 2.5 = 17.5 earned across three rows, plus 3 Gems on one.
--
-- Expired rows count here: this is what moved, not what is still good. That is
-- the difference from dbo.GetTallies, which is the balance and leaves them out.
--

CREATE FUNCTION "test"."TestGetPointTotals_SumsEachPointTypeSeparately" () RETURNS void AS $$
DECLARE
    _Points record;
    _Gems record;
BEGIN
    SELECT * INTO _Points FROM "dbo"."GetPointTotals"('member', "test"."Fixture"('Organization.Acme'))
    WHERE "PointUUID" = "test"."Fixture"('Point.Points');
    SELECT * INTO _Gems FROM "dbo"."GetPointTotals"('member', "test"."Fixture"('Organization.Acme'))
    WHERE "PointUUID" = "test"."Fixture"('Point.Gems');

    PERFORM "test"."AssertEquals"(_Points."Earned", 17.5000::decimal(19,4), '10 + 5 + 2.5, expired row included');
    PERFORM "test"."AssertEquals"(_Points."Transactions", 3::bigint, 'three Points rows');
    PERFORM "test"."AssertEquals"(_Gems."Earned", 3.0000::decimal(19,4), 'the gems row stands on its own');
END;
$$ LANGUAGE plpgsql;

-- The distinction that stopped CalculateUserPointBalance coming across: the
-- ledger total is not the balance, because the balance drops expired rows.
CREATE FUNCTION "test"."TestGetPointTotals_DifferFromTheBalanceByTheExpiredRows" () RETURNS void AS $$
DECLARE
    _Earned decimal(19,4);
    _Balance decimal(19,4);
BEGIN
    SELECT "Earned" INTO _Earned FROM "dbo"."GetPointTotals"('member', "test"."Fixture"('Organization.Acme'))
    WHERE "PointUUID" = "test"."Fixture"('Point.Points');
    SELECT "Amount" INTO _Balance FROM "dbo"."GetTallies"('member', "test"."Fixture"('Organization.Acme'), 0)
    WHERE "UserUUID" = "test"."Fixture"('User.Member') AND "PointUUID" = "test"."Fixture"('Point.Points');

    PERFORM "test"."AssertEquals"(_Earned, 17.5000::decimal(19,4), 'the ledger counts the 5 that expired');
    PERFORM "test"."AssertEquals"(_Balance, 12.5000::decimal(19,4), 'the balance does not');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPointTotals_SplitEarnedFromSpent" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    INSERT INTO "dbo"."UserPoints" ("UserUUID", "OrganizationUUID", "PointUUID", "Description", "Amount", "CreatedBy")
    VALUES ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 'Spent', -4.0000, 'test');

    SELECT * INTO _Row FROM "dbo"."GetPointTotals"('member', "test"."Fixture"('Organization.Acme'))
    WHERE "PointUUID" = "test"."Fixture"('Point.Points');

    PERFORM "test"."AssertEquals"(_Row."Earned", 17.5000::decimal(19,4), 'the debit should not reduce Earned');
    PERFORM "test"."AssertEquals"(_Row."Spent", 4.0000::decimal(19,4), 'Spent is reported positive');
    PERFORM "test"."AssertEquals"(_Row."Net", 13.5000::decimal(19,4), '17.5 less 4');
END;
$$ LANGUAGE plpgsql;

-- The daily/weekly/monthly drafts are this parameter. Fixture rows are created
-- inside the test transaction, so they are all "now" -- a window that starts in
-- the future is what proves the filter bites.
CREATE FUNCTION "test"."TestGetPointTotals_HonourTheSinceWindow" () RETURNS void AS $$
DECLARE
    _Recent bigint;
    _Future bigint;
BEGIN
    SELECT count(*) INTO _Recent FROM "dbo"."GetPointTotals"('member', "test"."Fixture"('Organization.Acme'), now() - interval '1 day');
    SELECT count(*) INTO _Future FROM "dbo"."GetPointTotals"('member', "test"."Fixture"('Organization.Acme'), now() + interval '1 day');
    PERFORM "test"."AssertEquals"(_Recent, 2::bigint, 'both point types moved within the last day');
    PERFORM "test"."AssertEquals"(_Future, 0::bigint, 'nothing moved after now');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPointTotals_ReturnNothingForANonMember" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetPointTotals"('outsider', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetPointTotals answered a caller who is not in the organization');
END;
$$ LANGUAGE plpgsql;
