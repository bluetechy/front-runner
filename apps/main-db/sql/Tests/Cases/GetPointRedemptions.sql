--
-- The member has two redemptions in the fixtures, one Pending and one Approved.
--

CREATE FUNCTION "test"."TestGetPointRedemptions_ReturnsTheUsersOwn" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetPointRedemptions"('member', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 2::bigint, 'the member has two redemptions');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPointRedemptions_FilterByStatus" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    SELECT * INTO _Row FROM "dbo"."GetPointRedemptions"('member', "test"."Fixture"('Organization.Acme'), 'Pending');
    PERFORM "test"."AssertEquals"(_Row."PointRedemptionUUID", "test"."Fixture"('PointRedemption.Pending'), 'only the pending one should match');
    PERFORM "test"."AssertEquals"(_Row."RedeemedAt", NULL::timestamptz, 'a pending redemption has not settled');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPointRedemptions_NameThePointType" () RETURNS void AS $$
DECLARE
    _Name varchar(64);
BEGIN
    SELECT "PointName" INTO _Name FROM "dbo"."GetPointRedemptions"('member', "test"."Fixture"('Organization.Acme'), 'Approved');
    PERFORM "test"."AssertEquals"(_Name::text, 'Points', 'the join to dbo.Points should resolve the name');
END;
$$ LANGUAGE plpgsql;

-- The redemptions are approved and still have not moved the balance.
CREATE FUNCTION "test"."TestGetPointRedemptions_DoNotImplyTheBalanceMoved" () RETURNS void AS $$
DECLARE
    _Redeemed decimal(19,4);
    _Balance decimal(19,4);
BEGIN
    SELECT SUM("Amount") INTO _Redeemed FROM "dbo"."GetPointRedemptions"('member', "test"."Fixture"('Organization.Acme'));
    SELECT "Amount" INTO _Balance FROM "dbo"."GetTallies"('member', "test"."Fixture"('Organization.Acme'), 0)
    WHERE "UserUUID" = "test"."Fixture"('User.Member') AND "PointUUID" = "test"."Fixture"('Point.Points');

    PERFORM "test"."AssertEquals"(_Redeemed, 3.0000::decimal(19,4), 'three points of redemptions on the books');
    PERFORM "test"."AssertEquals"(_Balance, 12.5000::decimal(19,4), 'and a balance that none of them touched');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPointRedemptions_ReturnNothingForANonMember" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetPointRedemptions"('outsider', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetPointRedemptions answered a caller who is not in the organization');
END;
$$ LANGUAGE plpgsql;
