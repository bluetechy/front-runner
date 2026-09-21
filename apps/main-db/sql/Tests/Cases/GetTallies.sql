CREATE FUNCTION "test"."TestGetTallies_ReturnsEveryTallyInTheOrganization" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetTallies"('member', "test"."Fixture"('Organization.Acme'), 0);
    PERFORM "test"."AssertEquals"(_Count, 3::bigint, 'Acme has three tallies: the member''s points and gems, and the owner''s points');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetTallies_ReportsTheUnexpiredBalance" () RETURNS void AS $$
DECLARE
    _Amount decimal(19,4);
BEGIN
    SELECT "Tallies"."Amount" INTO _Amount
    FROM "dbo"."GetTallies"('member', "test"."Fixture"('Organization.Acme'), 0) AS "Tallies"
    WHERE "Tallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "Tallies"."PointUUID" = "test"."Fixture"('Point.Points');
    PERFORM "test"."AssertEquals"(_Amount, 12.5000::decimal(19,4), 'the balance should be 10 active plus 2.5 future, with the expired 5 left out');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetTallies_TreatsZeroAsNoLimit" () RETURNS void AS $$
DECLARE
    _Unlimited bigint;
    _Limited bigint;
BEGIN
    SELECT count(*) INTO _Unlimited FROM "dbo"."GetTallies"('member', "test"."Fixture"('Organization.Acme'), 0);
    SELECT count(*) INTO _Limited FROM "dbo"."GetTallies"('member', "test"."Fixture"('Organization.Acme'), 2);
    PERFORM "test"."AssertEquals"(_Unlimited, 3::bigint, 'a limit of zero should return everything');
    PERFORM "test"."AssertEquals"(_Limited, 2::bigint, 'a limit of two should return two rows');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetTallies_ReturnsNothingForANonMember" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetTallies"('outsider', "test"."Fixture"('Organization.Acme'), 0);
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetTallies answered a caller who is not in the organization');
END;
$$ LANGUAGE plpgsql;
