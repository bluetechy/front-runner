--
-- The member sent one transfer (Pending, to the owner) and received one
-- (Completed, from the owner). Direction is relative to the caller, which is
-- the column the draft left every caller to work out for itself.
--

CREATE FUNCTION "test"."TestGetPointTransfers_ReturnBothDirections" () RETURNS void AS $$
DECLARE
    _Directions text;
BEGIN
    SELECT string_agg("Direction", ', ' ORDER BY "Direction") INTO _Directions
    FROM "dbo"."GetPointTransfers"('member', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Directions, 'Received, Sent', 'the member is on both ends of a transfer');
END;
$$ LANGUAGE plpgsql;

-- The same row reads Sent to one party and Received to the other.
CREATE FUNCTION "test"."TestGetPointTransfers_ReportDirectionRelativeToTheCaller" () RETURNS void AS $$
DECLARE
    _ToMember text;
    _ToOwner text;
BEGIN
    SELECT "Direction" INTO _ToMember FROM "dbo"."GetPointTransfers"('member', "test"."Fixture"('Organization.Acme'))
    WHERE "PointTransferUUID" = "test"."Fixture"('PointTransfer.Pending');
    SELECT "Direction" INTO _ToOwner FROM "dbo"."GetPointTransfers"('owner', "test"."Fixture"('Organization.Acme'))
    WHERE "PointTransferUUID" = "test"."Fixture"('PointTransfer.Pending');

    PERFORM "test"."AssertEquals"(_ToMember, 'Sent', 'the member sent it');
    PERFORM "test"."AssertEquals"(_ToOwner, 'Received', 'and the owner received it');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPointTransfers_NameBothParties" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    SELECT * INTO _Row FROM "dbo"."GetPointTransfers"('member', "test"."Fixture"('Organization.Acme'), 'Completed');
    PERFORM "test"."AssertEquals"(_Row."SenderName"::text, 'Olivia Owner', 'the sender should be named');
    PERFORM "test"."AssertEquals"(_Row."ReceiverName"::text, 'Marcus Member', 'and so should the receiver');
END;
$$ LANGUAGE plpgsql;

-- A transfer the caller is not party to stays invisible even inside their own
-- organization.
CREATE FUNCTION "test"."TestGetPointTransfers_HideTransfersBetweenOtherPeople" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    INSERT INTO "dbo"."PointTransfers" ("OrganizationUUID", "PointUUID", "SenderUserUUID", "ReceiverUserUUID", "Amount", "CreatedBy")
    VALUES ("test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), "test"."Fixture"('User.Owner'), "test"."Fixture"('User.Admin'), 1.0000, 'test');

    SELECT count(*) INTO _Count FROM "dbo"."GetPointTransfers"('member', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 2::bigint, 'the member should still see only their own two');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPointTransfers_ReturnNothingForANonMember" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetPointTransfers"('outsider', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetPointTransfers answered a caller who is not in the organization');
END;
$$ LANGUAGE plpgsql;
