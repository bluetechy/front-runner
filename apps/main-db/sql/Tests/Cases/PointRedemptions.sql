--
-- A redemption is paperwork. The balance only moves when a negative
-- dbo.UserPoints row is written, and nothing here writes one -- approving a
-- redemption and settling it are two different things.
--

CREATE FUNCTION "test"."TestPointRedemptions_DoNotMoveTheBalance" () RETURNS void AS $$
DECLARE
    _Amount decimal(19,4);
BEGIN
    SELECT "Amount" INTO _Amount FROM "dbo"."UserTallies"
    WHERE "UserTallies"."UserUUID" = "test"."Fixture"('User.Member')
        AND "UserTallies"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserTallies"."PointUUID" = "test"."Fixture"('Point.Points');

    PERFORM "test"."AssertEquals"(_Amount, 12.5000::decimal(19,4), 'the member has 3 points of redemptions against an untouched tally of 12.5');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestPointRedemptions_StartPending" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    INSERT INTO "dbo"."PointRedemptions" ("UserUUID", "OrganizationUUID", "PointUUID", "Amount", "Description", "CreatedBy")
    VALUES ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 4.0000, 'Notebook.', 'test')
    RETURNING * INTO _Row;

    PERFORM "test"."AssertEquals"(_Row."Status"::text, 'Pending', 'a new redemption should start Pending');
    PERFORM "test"."AssertEquals"(_Row."RedeemedAt", NULL::timestamptz, 'a Pending redemption has not been settled, so RedeemedAt should be NULL');
END;
$$ LANGUAGE plpgsql;

-- Nothing stops a user redeeming more than they hold; the check belongs in
-- whatever settles the redemption. Written down so the absence is deliberate.
CREATE FUNCTION "test"."TestPointRedemptions_AcceptMoreThanTheUserHolds" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    INSERT INTO "dbo"."PointRedemptions" ("UserUUID", "OrganizationUUID", "PointUUID", "Amount", "Description", "CreatedBy")
    VALUES ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 9999.0000, 'The whole shop.', 'test');

    SELECT count(*) INTO _Count FROM "dbo"."PointRedemptions"
    WHERE "UserUUID" = "test"."Fixture"('User.Member') AND "Amount" = 9999.0000;
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'the table itself does not check affordability -- the settling step has to');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestPointRedemptions_RejectAnUnknownUser" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."PointRedemptions" ("UserUUID", "OrganizationUUID", "PointUUID", "Amount", "Description", "CreatedBy") VALUES (''00000000-0000-4000-8000-000000000000'', %L, %L, 1.0000, ''Orphan.'', ''test'')',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points')
        ),
        'PointRedemptions accepted a user that does not exist'
    );
END;
$$ LANGUAGE plpgsql;
