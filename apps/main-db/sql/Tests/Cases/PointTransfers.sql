--
-- Like dbo.PointRedemptions, a transfer is the record and not the movement:
-- settling one means writing the matching pair of dbo.UserPoints rows, which
-- nothing does yet. A transfer marked Completed is still only a row.
--

CREATE FUNCTION "test"."TestPointTransfers_DoNotMoveEitherBalance" () RETURNS void AS $$
DECLARE
    _MemberAmount decimal(19,4);
    _OwnerAmount decimal(19,4);
BEGIN
    SELECT "Amount" INTO _MemberAmount FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');
    SELECT "Amount" INTO _OwnerAmount FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Owner')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');

    PERFORM "test"."AssertEquals"(_MemberAmount, 12.5000::decimal(19,4), 'a Completed transfer out did not leave the sender''s tally alone');
    PERFORM "test"."AssertEquals"(_OwnerAmount, 7.0000::decimal(19,4), 'a Completed transfer in did not leave the receiver''s tally alone');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestPointTransfers_StartPending" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    INSERT INTO "dbo"."PointTransfers" ("OrganizationUUID", "PointUUID", "SenderUserUUID", "ReceiverUserUUID", "Amount", "CreatedBy")
    VALUES ("test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), "test"."Fixture"('User.Member'), "test"."Fixture"('User.Owner'), 1.0000, 'test')
    RETURNING * INTO _Row;

    PERFORM "test"."AssertEquals"(_Row."Status"::text, 'Pending', 'a new transfer should start Pending');
    PERFORM "test"."AssertEquals"(_Row."TransferredAt", NULL::timestamptz, 'a Pending transfer has not settled, so TransferredAt should be NULL');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestPointTransfers_RejectAnUnknownSender" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."PointTransfers" ("OrganizationUUID", "PointUUID", "SenderUserUUID", "ReceiverUserUUID", "Amount", "CreatedBy") VALUES (%L, %L, ''00000000-0000-4000-8000-000000000000'', %L, 1.0000, ''test'')',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), "test"."Fixture"('User.Owner')
        ),
        'PointTransfers accepted a sender that does not exist'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestPointTransfers_RejectAnUnknownReceiver" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."PointTransfers" ("OrganizationUUID", "PointUUID", "SenderUserUUID", "ReceiverUserUUID", "Amount", "CreatedBy") VALUES (%L, %L, %L, ''00000000-0000-4000-8000-000000000000'', 1.0000, ''test'')',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), "test"."Fixture"('User.Member')
        ),
        'PointTransfers accepted a receiver that does not exist'
    );
END;
$$ LANGUAGE plpgsql;

-- Nothing stops a user transferring to themselves, or transferring more than
-- they hold. Both belong to whatever settles the transfer; recorded here so
-- the gap is deliberate rather than forgotten.
CREATE FUNCTION "test"."TestPointTransfers_AcceptATransferToSelf" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    INSERT INTO "dbo"."PointTransfers" ("OrganizationUUID", "PointUUID", "SenderUserUUID", "ReceiverUserUUID", "Amount", "CreatedBy")
    VALUES ("test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), "test"."Fixture"('User.Member'), "test"."Fixture"('User.Member'), 1.0000, 'test');

    SELECT count(*) INTO _Count FROM "dbo"."PointTransfers"
    WHERE "SenderUserUUID" = "test"."Fixture"('User.Member')
        AND "ReceiverUserUUID" = "test"."Fixture"('User.Member');
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'the table does not reject self-transfers -- the settling step has to');
END;
$$ LANGUAGE plpgsql;
