--
-- GetUsersWithBadge and GetBadgeOwners were byte-identical drafts. This is both.
--

CREATE FUNCTION "test"."TestGetBadgeHolders_ListsWhoHoldsABadge" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    SELECT * INTO _Row FROM "dbo"."GetBadgeHolders"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Rookie'));
    PERFORM "test"."AssertEquals"(_Row."LoginName"::text, 'member', 'the member is the only holder of Rookie');
END;
$$ LANGUAGE plpgsql;

-- The same rule as everywhere: in progress and revoked do not count as held.
CREATE FUNCTION "test"."TestGetBadgeHolders_ExcludeInProgressAndRevoked" () RETURNS void AS $$
DECLARE
    _InProgress bigint;
    _Revoked bigint;
BEGIN
    SELECT count(*) INTO _InProgress FROM "dbo"."GetBadgeHolders"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.InProgress'));
    SELECT count(*) INTO _Revoked    FROM "dbo"."GetBadgeHolders"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Revoked'));
    PERFORM "test"."AssertEquals"(_InProgress, 0::bigint, 'the member is 4/10 of the way to it, which is not holding it');
    PERFORM "test"."AssertEquals"(_Revoked, 0::bigint, 'and the revoked one was taken back');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetBadgeHolders_ReturnNothingForANonMember" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetBadgeHolders"('outsider', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Rookie'));
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetBadgeHolders answered a caller outside the organization');
END;
$$ LANGUAGE plpgsql;
