--
-- The pair of functions that finally makes a transfer move points. Requesting
-- records intent; settling writes the two ledger rows.
--

CREATE FUNCTION "test"."TestRequestPointTransfer_RecordsIntentWithoutMovingAnything" () RETURNS void AS $$
DECLARE
    _UUID uuid;
    _Sender decimal(19,4);
BEGIN
    _UUID := "dbo"."RequestPointTransfer"('member', "test"."Fixture"('Organization.Acme'),
                                          "test"."Fixture"('User.Owner'), "test"."Fixture"('Point.Points'), 2.0000, 'Thanks');

    PERFORM "test"."AssertRowCount"(
        format('SELECT 1 FROM "dbo"."PointTransfers" WHERE "PointTransferUUID" = %L AND "Status" = ''Pending''', _UUID),
        1, 'the request should be on the books as Pending');

    SELECT "Amount" INTO _Sender FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');
    PERFORM "test"."AssertEquals"(_Sender, 12.5000::decimal(19,4), 'and the sender should not have paid yet');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestRequestPointTransfer_RejectsMoreThanTheSenderHas" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."RequestPointTransfer"(''member'', %L, %L, %L, 9999.0000, ''Too much'')',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Owner'), "test"."Fixture"('Point.Points')),
        'a transfer larger than the balance was accepted'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestRequestPointTransfer_RejectsSendingToYourself" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."RequestPointTransfer"(''member'', %L, %L, %L, 1.0000, ''Me'')',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Member'), "test"."Fixture"('Point.Points')),
        'the table allows a self-transfer; the function should not'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestRequestPointTransfer_RejectsAReceiverOutsideTheOrganization" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."RequestPointTransfer"(''member'', %L, %L, %L, 1.0000, ''Stranger'')',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Outsider'), "test"."Fixture"('Point.Points')),
        'points were sent out of the organization'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestRequestPointTransfer_HonoursTheTransferLimit" () RETURNS void AS $$
BEGIN
    UPDATE "dbo"."UserTallies" SET "DailyTransferLimit" = 1.0000, "UpdatedBy" = 'test'
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');

    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."RequestPointTransfer"(''member'', %L, %L, %L, 5.0000, ''Over the cap'')',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('User.Owner'), "test"."Fixture"('Point.Points')),
        'the daily transfer cap was ignored'
    );
END;
$$ LANGUAGE plpgsql;

-- This is the gap closing: before these functions a transfer marked Completed
-- had moved nothing.
CREATE FUNCTION "test"."TestSettlePointTransfer_MovesPointsBetweenBothParties" () RETURNS void AS $$
DECLARE
    _Sender decimal(19,4);
    _Receiver decimal(19,4);
    _Status varchar(20);
BEGIN
    _Status := "dbo"."SettlePointTransfer"('owner', "test"."Fixture"('Organization.Acme'),
                                           "test"."Fixture"('PointTransfer.Pending'), true);
    PERFORM "test"."AssertEquals"(_Status::text, 'Completed', 'approving should complete it');

    SELECT "Amount" INTO _Sender FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member') AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');
    SELECT "Amount" INTO _Receiver FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Owner') AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');

    PERFORM "test"."AssertEquals"(_Sender, 11.0000::decimal(19,4), '12.5 less the 1.5 that left');
    PERFORM "test"."AssertEquals"(_Receiver, 8.5000::decimal(19,4), '7 plus the 1.5 that arrived');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSettlePointTransfer_LeavesAnAuditTrailOnBothSides" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    PERFORM "dbo"."SettlePointTransfer"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('PointTransfer.Pending'), true);

    SELECT count(*) INTO _Count FROM "dbo"."UserPoints"
    WHERE "UserPoints"."Reason" = 'Transfer'
        AND "UserPoints"."Details" ->> 'PointTransferUUID' = "test"."Fixture"('PointTransfer.Pending')::text;
    PERFORM "test"."AssertEquals"(_Count, 2::bigint, 'one ledger row each, both pointing back at the transfer');
END;
$$ LANGUAGE plpgsql;

-- ApprovePointTransferRequest deleted the row on rejection, losing the record.
CREATE FUNCTION "test"."TestSettlePointTransfer_CancelsWithoutDeletingOrMoving" () RETURNS void AS $$
DECLARE
    _Status varchar(20);
    _Sender decimal(19,4);
BEGIN
    _Status := "dbo"."SettlePointTransfer"('owner', "test"."Fixture"('Organization.Acme'),
                                           "test"."Fixture"('PointTransfer.Pending'), false);
    PERFORM "test"."AssertEquals"(_Status::text, 'Cancelled', 'rejecting should cancel it');

    PERFORM "test"."AssertRowCount"(
        format('SELECT 1 FROM "dbo"."PointTransfers" WHERE "PointTransferUUID" = %L', "test"."Fixture"('PointTransfer.Pending')),
        1, 'the row should survive rejection rather than being deleted');

    SELECT "Amount" INTO _Sender FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member') AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');
    PERFORM "test"."AssertEquals"(_Sender, 12.5000::decimal(19,4), 'and nothing should have moved');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSettlePointTransfer_RefusesToSettleTwice" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."SettlePointTransfer"('owner', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('PointTransfer.Pending'), true);

    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."SettlePointTransfer"(''owner'', %L, %L, true)',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('PointTransfer.Pending')),
        'a settled transfer was settled again, moving the points twice'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSettlePointTransfer_RejectsANonOwner" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."SettlePointTransfer"(''member'', %L, %L, true)',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('PointTransfer.Pending')),
        'the sender approved their own transfer'
    );
END;
$$ LANGUAGE plpgsql;
