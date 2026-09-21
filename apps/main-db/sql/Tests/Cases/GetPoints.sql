-- GetPoints is the ledger, not the balance: it returns every row including the
-- expired ones. The running balance is GetTallies.
CREATE FUNCTION "test"."TestGetPoints_ReturnsEveryLedgerRow" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetPoints"('member', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 4::bigint, 'the member has four point rows, expired ones included');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPoints_IncludesExpiredRows" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetPoints"('member', "test"."Fixture"('Organization.Acme')) AS "Points"
    WHERE "Points"."UserPointUUID" = "test"."Fixture"('UserPoint.MemberExpired');
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'GetPoints dropped the expired row');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPoints_NamesThePointType" () RETURNS void AS $$
DECLARE
    _Point record;
BEGIN
    SELECT * INTO _Point FROM "dbo"."GetPoints"('member', "test"."Fixture"('Organization.Acme')) AS "Points"
    WHERE "Points"."UserPointUUID" = "test"."Fixture"('UserPoint.MemberGems');
    PERFORM "test"."AssertEquals"(_Point."Name"::text, 'Gems', 'GetPoints did not join through to the point type name');
    PERFORM "test"."AssertEquals"(_Point."Amount", 3.0000::decimal(19,4), 'GetPoints returned the wrong amount');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPoints_ReturnsNothingForANonMember" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetPoints"('outsider', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetPoints answered a caller who is not in the organization');
END;
$$ LANGUAGE plpgsql;
