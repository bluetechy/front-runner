--
-- Organization-wide, grouped by reason. Only the member's Active row carries a
-- Reason in the fixtures; everything else groups under NULL.
--

CREATE FUNCTION "test"."TestGetPointStatistics_GroupsByReason" () RETURNS void AS $$
DECLARE
    _Award record;
BEGIN
    SELECT * INTO _Award FROM "dbo"."GetPointStatistics"('member', "test"."Fixture"('Organization.Acme'))
    WHERE "Reason" = 'Award';
    PERFORM "test"."AssertEquals"(_Award."Earned", 10.0000::decimal(19,4), 'the Award reason covers the 10-point Active row');
    PERFORM "test"."AssertEquals"(_Award."Transactions", 1::bigint, 'one transaction carries it');
END;
$$ LANGUAGE plpgsql;

-- The draft dropped rows with no reason by grouping on a column it also
-- filtered. Keeping them means the totals still add up.
CREATE FUNCTION "test"."TestGetPointStatistics_KeepsRowsWithNoReason" () RETURNS void AS $$
DECLARE
    _Unreasoned bigint;
BEGIN
    SELECT "Transactions" INTO _Unreasoned FROM "dbo"."GetPointStatistics"('member', "test"."Fixture"('Organization.Acme'))
    WHERE "Reason" IS NULL;
    PERFORM "test"."AssertEquals"(_Unreasoned, 4::bigint, 'the four fixture rows with no reason should group together, not vanish');
END;
$$ LANGUAGE plpgsql;

-- GetPointUsageStatistics only ever reported debits. Reporting both sides from
-- the same grouping costs nothing and answers "what earns points" too.
CREATE FUNCTION "test"."TestGetPointStatistics_ReportBothSides" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    INSERT INTO "dbo"."UserPoints" ("UserUUID", "OrganizationUUID", "PointUUID", "Description", "Reason", "Amount", "CreatedBy")
    VALUES ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 'Bought a mug', 'Redeemed', -6.0000, 'test');

    SELECT * INTO _Row FROM "dbo"."GetPointStatistics"('member', "test"."Fixture"('Organization.Acme'))
    WHERE "Reason" = 'Redeemed';
    PERFORM "test"."AssertEquals"(_Row."Spent", 6.0000::decimal(19,4), 'spending is reported positive, as the draft did');
    PERFORM "test"."AssertEquals"(_Row."Earned", 0.0000::decimal(19,4), 'and nothing was earned under that reason');
END;
$$ LANGUAGE plpgsql;

-- Organization-wide, not per-user: the owner's rows are in here too.
CREATE FUNCTION "test"."TestGetPointStatistics_CoverTheWholeOrganization" () RETURNS void AS $$
DECLARE
    _Total bigint;
BEGIN
    SELECT SUM("Transactions") INTO _Total FROM "dbo"."GetPointStatistics"('member', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Total, 5::bigint, 'four rows for the member and one for the owner');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPointStatistics_ReturnNothingForANonMember" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetPointStatistics"('outsider', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetPointStatistics answered a caller who is not in the organization');
END;
$$ LANGUAGE plpgsql;
