--
-- RedeemPoints deducted the points *and* filed the redemption as Pending, so a
-- redemption awaiting approval was already paid for and rejecting it gave
-- nothing back. Requesting and settling are separate here, and these tests are
-- mostly about that seam.
--

CREATE FUNCTION "test"."TestRequestPointRedemption_DoesNotSpendAnything" () RETURNS void AS $$
DECLARE
    _UUID uuid;
    _Balance decimal(19,4);
BEGIN
    _UUID := "dbo"."RequestPointRedemption"('member', "test"."Fixture"('Organization.Acme'),
                                            "test"."Fixture"('Point.Points'), 4.0000, 'A mug');

    PERFORM "test"."AssertRowCount"(
        format('SELECT 1 FROM "dbo"."PointRedemptions" WHERE "PointRedemptionUUID" = %L AND "Status" = ''Pending''', _UUID),
        1, 'the request should be Pending');

    SELECT "Amount" INTO _Balance FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member') AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');
    PERFORM "test"."AssertEquals"(_Balance, 12.5000::decimal(19,4), 'asking must not cost anything -- that was the draft''s bug');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestRequestPointRedemption_RejectsMoreThanTheBalance" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."RequestPointRedemption"(''member'', %L, %L, 9999.0000, ''The whole shop'')',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points')),
        'the affordability check from RedeemPoints should have survived'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSettlePointRedemption_SpendsOnApproval" () RETURNS void AS $$
DECLARE
    _Status varchar(20);
    _Balance decimal(19,4);
BEGIN
    _Status := "dbo"."SettlePointRedemption"('owner', "test"."Fixture"('Organization.Acme'),
                                             "test"."Fixture"('PointRedemption.Pending'), true);
    PERFORM "test"."AssertEquals"(_Status::text, 'Approved', 'approving should approve it');

    SELECT "Amount" INTO _Balance FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member') AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');
    PERFORM "test"."AssertEquals"(_Balance, 10.5000::decimal(19,4), '12.5 less the 2-point voucher');
END;
$$ LANGUAGE plpgsql;

-- The reason the deduction belongs at settlement and not at request.
CREATE FUNCTION "test"."TestSettlePointRedemption_CostsNothingOnRejection" () RETURNS void AS $$
DECLARE
    _Status varchar(20);
    _Balance decimal(19,4);
BEGIN
    _Status := "dbo"."SettlePointRedemption"('owner', "test"."Fixture"('Organization.Acme'),
                                             "test"."Fixture"('PointRedemption.Pending'), false);
    PERFORM "test"."AssertEquals"(_Status::text, 'Rejected', 'rejecting should reject it');

    SELECT "Amount" INTO _Balance FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member') AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');
    PERFORM "test"."AssertEquals"(_Balance, 12.5000::decimal(19,4), 'a refused redemption costs nothing');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSettlePointRedemption_LinksTheLedgerRowBack" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    PERFORM "dbo"."SettlePointRedemption"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('PointRedemption.Pending'), true);

    SELECT * INTO _Row FROM "dbo"."UserPoints"
    WHERE "UserPoints"."Details" ->> 'PointRedemptionUUID' = "test"."Fixture"('PointRedemption.Pending')::text;
    PERFORM "test"."AssertEquals"(_Row."Amount", -2.0000::decimal(19,4), 'the ledger row is the negative of the redemption');
    PERFORM "test"."AssertEquals"(_Row."Reason"::text, 'Redeemed', 'and it is categorised as a redemption');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSettlePointRedemption_RefusesToSettleTwice" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."SettlePointRedemption"(''owner'', %L, %L, true)',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('PointRedemption.Approved')),
        'an already-approved redemption was approved again'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSettlePointRedemption_RejectsANonOwner" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."SettlePointRedemption"(''member'', %L, %L, true)',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('PointRedemption.Pending')),
        'the requester approved their own redemption'
    );
END;
$$ LANGUAGE plpgsql;
