--
-- The owner holds Seasonal, which lapsed in 2020.
--

CREATE FUNCTION "test"."TestGetExpiredBadges_FindBadgesPastTheirExpiry" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    SELECT * INTO _Row FROM "dbo"."GetExpiredBadges"('member', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Row."Name"::text, 'Seasonal', 'the seasonal badge lapsed in 2020');
    PERFORM "test"."AssertEquals"(_Row."UserName"::text, 'Olivia Owner', 'and the owner is the one holding it');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetExpiredBadges_IgnoreBadgesWithNoExpiry" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetExpiredBadges"('member', "test"."Fixture"('Organization.Acme'), '3000-01-01 00:00:00+00'::timestamptz);
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'however far ahead you look, an open-ended badge never expires');
END;
$$ LANGUAGE plpgsql;

-- The draft returned rows whether or not the holder had earned the badge.
CREATE FUNCTION "test"."TestGetExpiredBadges_IgnoreBadgesNobodyHasEarned" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    INSERT INTO "dbo"."UserBadges" ("UserUUID", "OrganizationUUID", "BadgeUUID", "ProgressCurrent", "CreatedBy")
    VALUES ("test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Expiring'), 0, 'test');

    SELECT count(*) INTO _Count FROM "dbo"."GetExpiredBadges"('member', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'a lapsed badge somebody never earned is not their expired badge');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetExpiredBadges_ReturnNothingForANonMember" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetExpiredBadges"('outsider', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetExpiredBadges answered a caller outside the organization');
END;
$$ LANGUAGE plpgsql;
