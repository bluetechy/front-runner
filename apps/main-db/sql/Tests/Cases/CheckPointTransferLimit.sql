--
-- The caps live on dbo.UserTallies and default to NULL, which means no cap, so
-- every test here sets them first. Only Completed transfers count against
-- them: a Pending one has not left yet.
--

CREATE FUNCTION "test"."TestCheckPointTransferLimit_AllowsAnythingWithNoCapSet" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertTrue"(
        "dbo"."CheckPointTransferLimit"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 9999.0000),
        'a NULL cap means no cap'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestCheckPointTransferLimit_RejectsOverTheDailyCap" () RETURNS void AS $$
BEGIN
    UPDATE "dbo"."UserTallies" SET "DailyTransferLimit" = 10.0000, "UpdatedBy" = 'test'
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');

    PERFORM "test"."AssertTrue"(
        "dbo"."CheckPointTransferLimit"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 10.0000),
        'exactly on the cap is within it');
    PERFORM "test"."AssertFalse"(
        "dbo"."CheckPointTransferLimit"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 10.0001),
        'a hair over the cap is not');
END;
$$ LANGUAGE plpgsql;

-- The fixture transfer out is Pending, so it must not consume any of the cap.
CREATE FUNCTION "test"."TestCheckPointTransferLimit_IgnoresPendingTransfers" () RETURNS void AS $$
BEGIN
    UPDATE "dbo"."UserTallies" SET "DailyTransferLimit" = 2.0000, "UpdatedBy" = 'test'
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');

    PERFORM "test"."AssertTrue"(
        "dbo"."CheckPointTransferLimit"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 2.0000),
        'the member has a 1.5 transfer out already, but it is Pending and should not count'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestCheckPointTransferLimit_CountsCompletedTransfers" () RETURNS void AS $$
BEGIN
    UPDATE "dbo"."UserTallies" SET "DailyTransferLimit" = 5.0000, "UpdatedBy" = 'test'
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');

    INSERT INTO "dbo"."PointTransfers" ("OrganizationUUID", "PointUUID", "SenderUserUUID", "ReceiverUserUUID", "Amount", "Status", "TransferredAt", "CreatedBy")
    VALUES ("test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), "test"."Fixture"('User.Member'), "test"."Fixture"('User.Owner'), 4.0000, 'Completed', now(), 'test');

    PERFORM "test"."AssertTrue"(
        "dbo"."CheckPointTransferLimit"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 1.0000),
        '4 sent plus 1 is exactly the cap of 5');
    PERFORM "test"."AssertFalse"(
        "dbo"."CheckPointTransferLimit"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 2.0000),
        '4 sent plus 2 is over it');
END;
$$ LANGUAGE plpgsql;

-- The monthly cap bites where the daily one does not: a transfer settled
-- earlier this month but not today.
CREATE FUNCTION "test"."TestCheckPointTransferLimit_AppliesTheMonthlyCapSeparately" () RETURNS void AS $$
BEGIN
    UPDATE "dbo"."UserTallies" SET "DailyTransferLimit" = 100.0000, "MonthlyTransferLimit" = 5.0000, "UpdatedBy" = 'test'
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');

    INSERT INTO "dbo"."PointTransfers" ("OrganizationUUID", "PointUUID", "SenderUserUUID", "ReceiverUserUUID", "Amount", "Status", "TransferredAt", "CreatedBy")
    VALUES ("test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), "test"."Fixture"('User.Member'), "test"."Fixture"('User.Owner'), 4.0000, 'Completed', date_trunc('month', now()), 'test');

    PERFORM "test"."AssertTrue"(
        "dbo"."CheckPointTransferLimit"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 1.0000),
        '4 this month plus 1 is exactly the monthly cap');
    PERFORM "test"."AssertFalse"(
        "dbo"."CheckPointTransferLimit"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 2.0000),
        'and 2 breaks it, with the daily cap nowhere near');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestCheckPointTransferLimit_RefusesANonMember" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertFalse"(
        "dbo"."CheckPointTransferLimit"('outsider', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 1.0000),
        'a caller outside the organization cannot transfer within it'
    );
END;
$$ LANGUAGE plpgsql;
