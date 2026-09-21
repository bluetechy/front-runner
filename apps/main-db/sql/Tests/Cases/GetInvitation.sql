-- The shape every invitation function returns. It is tested on its own because
-- the other six return it verbatim: a column that comes back wrong here comes
-- back wrong everywhere.
CREATE FUNCTION "test"."TestGetInvitation_ResolvesTheOrganizationAndTheInviter" () RETURNS void AS $$
DECLARE
    _Invitation record;
BEGIN
    SELECT * INTO _Invitation FROM "dbo"."GetInvitation"("test"."Fixture"('Invitation.Pending'));

    PERFORM "test"."AssertEquals"(_Invitation."OrganizationUUID", "test"."Fixture"('Organization.Acme'), 'GetInvitation returned the wrong organization');
    PERFORM "test"."AssertEquals"(_Invitation."OrganizationName"::text, 'Acme', 'GetInvitation did not resolve the organization name');
    PERFORM "test"."AssertEquals"(_Invitation."InvitedByLoginName"::text, 'owner', 'GetInvitation did not resolve the inviter');
    PERFORM "test"."AssertEquals"(_Invitation."Email"::text, 'outsider@example.test', 'GetInvitation returned the wrong address');
    PERFORM "test"."AssertEquals"(_Invitation."Status"::text, 'Pending', 'GetInvitation returned the wrong status');
END;
$$ LANGUAGE plpgsql;

-- It is a projection with no permission check of its own, so it will happily
-- describe an invitation into a disabled organization. The callers are where
-- that gets refused.
CREATE FUNCTION "test"."TestGetInvitation_DoesNotFilterOnItsOwn" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetInvitation"("test"."Fixture"('Invitation.DisabledOrg'));
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'GetInvitation hid an invitation its callers are responsible for filtering');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetInvitation_ReturnsNothingForAnUnknownInvitation" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetInvitation"('00000000-0000-4000-8000-000000000000');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetInvitation returned a row for an invitation that does not exist');
END;
$$ LANGUAGE plpgsql;
