--
-- A reversal is a correcting entry, not a delete: the original stays and the
-- negation sits beside it.
--

CREATE FUNCTION "test"."TestReverseUserPoints_WritesTheNegationAndKeepsTheOriginal" () RETURNS void AS $$
DECLARE
    _Reversal uuid;
    _Row record;
BEGIN
    _Reversal := "dbo"."ReverseUserPoints"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('UserPoint.MemberActive'));

    SELECT * INTO _Row FROM "dbo"."UserPoints" WHERE "UserPointUUID" = _Reversal;
    PERFORM "test"."AssertEquals"(_Row."Amount", -10.0000::decimal(19,4), 'the reversal is the negation of the 10-point row');
    PERFORM "test"."AssertEquals"(_Row."Reason"::text, 'Reversal', 'and it says so');
    PERFORM "test"."AssertEquals"(_Row."ReversesUserPointUUID", "test"."Fixture"('UserPoint.MemberActive'), 'and it names what it undid');

    PERFORM "test"."AssertRowCount"(
        format('SELECT 1 FROM "dbo"."UserPoints" WHERE "UserPointUUID" = %L', "test"."Fixture"('UserPoint.MemberActive')),
        1, 'the original must survive -- this is a correcting entry, not a delete');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestReverseUserPoints_MovesTheTally" () RETURNS void AS $$
DECLARE
    _Amount decimal(19,4);
BEGIN
    PERFORM "dbo"."ReverseUserPoints"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('UserPoint.MemberActive'));

    SELECT "Amount" INTO _Amount FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');
    PERFORM "test"."AssertEquals"(_Amount, 2.5000::decimal(19,4), '12.5 less the reversed 10');
END;
$$ LANGUAGE plpgsql;

-- The draft could reverse the same row over and over, each time moving the
-- balance again. The unique key on ReversesUserPointUUID is what stops it.
CREATE FUNCTION "test"."TestReverseUserPoints_RefusesToReverseTwice" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."ReverseUserPoints"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('UserPoint.MemberActive'));

    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."ReverseUserPoints"(''owner'', %L, %L)',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('UserPoint.MemberActive')),
        'the same transaction was reversed twice'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestReverseUserPoints_RefusesToReverseAReversal" () RETURNS void AS $$
DECLARE
    _Reversal uuid;
BEGIN
    _Reversal := "dbo"."ReverseUserPoints"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('UserPoint.MemberActive'));

    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."ReverseUserPoints"(''owner'', %L, %L)', "test"."Fixture"('Organization.Acme'), _Reversal),
        'a reversal was itself reversed, which would just re-apply the original'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestReverseUserPoints_RejectsANonOwner" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."ReverseUserPoints"(''member'', %L, %L)',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('UserPoint.MemberActive')),
        'a plain member reversed a ledger row'
    );
END;
$$ LANGUAGE plpgsql;
