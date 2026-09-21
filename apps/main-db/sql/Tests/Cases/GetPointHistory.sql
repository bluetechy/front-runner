--
-- The member's ledger is four rows: Active 10, Expired 5, Not yet due 2.5, all
-- of Point.Points, plus Gems 3. Only the first carries a Reason and Details.
--

CREATE FUNCTION "test"."TestGetPointHistory_ReturnsTheWholeLedgerByDefault" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetPointHistory"('member', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 4::bigint, 'the member has four point rows and no filter was given');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPointHistory_FiltersByPointType" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetPointHistory"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Gems'));
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'only the gems row is of that point type');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPointHistory_FiltersByReason" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    SELECT * INTO _Row FROM "dbo"."GetPointHistory"('member', "test"."Fixture"('Organization.Acme'), NULL, 'Award');
    PERFORM "test"."AssertEquals"(_Row."UserPointUUID", "test"."Fixture"('UserPoint.MemberActive'), 'only the Active row carries the Award reason');
    PERFORM "test"."AssertEquals"(_Row."Details", '{"Source": "fixtures"}'::jsonb, 'the jsonb details should come back intact');
END;
$$ LANGUAGE plpgsql;

-- GetPointEarningsHistory filtered PointsChange > 0. Every fixture row is a
-- credit, so a debit has to be written to prove the filter does anything.
CREATE FUNCTION "test"."TestGetPointHistory_FiltersBySign" () RETURNS void AS $$
DECLARE
    _Credits bigint;
    _Debits bigint;
BEGIN
    INSERT INTO "dbo"."UserPoints" ("UserUUID", "OrganizationUUID", "PointUUID", "Description", "Amount", "CreatedBy")
    VALUES ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points'), 'Spent', -4.0000, 'test');

    SELECT count(*) INTO _Credits FROM "dbo"."GetPointHistory"('member', "test"."Fixture"('Organization.Acme'), NULL, NULL, 1);
    SELECT count(*) INTO _Debits  FROM "dbo"."GetPointHistory"('member', "test"."Fixture"('Organization.Acme'), NULL, NULL, -1);
    PERFORM "test"."AssertEquals"(_Credits, 4::bigint, 'the four fixture rows are all credits');
    PERFORM "test"."AssertEquals"(_Debits, 1::bigint, 'only the row just written is a debit');
END;
$$ LANGUAGE plpgsql;

-- CheckExpiringPoints became this filter. A row with no ExpiresAt never
-- expires, so it must not come back however far ahead you look.
CREATE FUNCTION "test"."TestGetPointHistory_FindsRowsExpiringBeforeAMoment" () RETURNS void AS $$
DECLARE
    _Near text;
    _Far text;
BEGIN
    -- The fixtures expire in 2020 and in 2999, so the horizon picks them apart.
    SELECT string_agg("Description", ', ' ORDER BY "Description") INTO _Near
    FROM "dbo"."GetPointHistory"('member', "test"."Fixture"('Organization.Acme'), NULL, NULL, NULL, '2100-01-01 00:00:00+00'::timestamptz);
    PERFORM "test"."AssertEquals"(_Near, 'Expired', 'only the row that already expired falls before 2100');

    SELECT string_agg("Description", ', ' ORDER BY "Description") INTO _Far
    FROM "dbo"."GetPointHistory"('member', "test"."Fixture"('Organization.Acme'), NULL, NULL, NULL, '3000-01-01 00:00:00+00'::timestamptz);
    PERFORM "test"."AssertEquals"(_Far, 'Expired, Not yet due', 'both dated rows fall before 3000 -- and the two with no ExpiresAt never match, however far ahead you look');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPointHistory_AppliesARowLimit" () RETURNS void AS $$
DECLARE
    _Limited bigint;
    _Zero bigint;
BEGIN
    SELECT count(*) INTO _Limited FROM "dbo"."GetPointHistory"('member', "test"."Fixture"('Organization.Acme'), NULL, NULL, NULL, NULL, 2);
    SELECT count(*) INTO _Zero    FROM "dbo"."GetPointHistory"('member', "test"."Fixture"('Organization.Acme'), NULL, NULL, NULL, NULL, 0);
    PERFORM "test"."AssertEquals"(_Limited, 2::bigint, 'a row limit of two should return two');
    PERFORM "test"."AssertEquals"(_Zero, 4::bigint, 'zero means no limit, matching GetTallies');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetPointHistory_ReturnsNothingForANonMember" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetPointHistory"('outsider', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'the drafts had no authorization at all -- this one does');
END;
$$ LANGUAGE plpgsql;
