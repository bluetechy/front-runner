-- Outsider holds two invitations in the fixtures, but one of them is into a
-- disabled organization. Only the answerable one comes back.
CREATE FUNCTION "test"."TestGetUserInvitations_ReturnsWhatTheUserCanStillAnswer" () RETURNS void AS $$
DECLARE
    _Invitation record;
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetUserInvitations"('outsider');
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'the outsider should have exactly one answerable invitation');

    SELECT * INTO _Invitation FROM "dbo"."GetUserInvitations"('outsider');
    PERFORM "test"."AssertEquals"(_Invitation."InvitationUUID", "test"."Fixture"('Invitation.Pending'), 'GetUserInvitations returned the wrong invitation');
    PERFORM "test"."AssertEquals"(_Invitation."OrganizationName"::text, 'Acme', 'the invitation names the wrong organization');
    PERFORM "test"."AssertEquals"(_Invitation."InvitedByLoginName"::text, 'owner', 'the invitation names the wrong inviter');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetUserInvitations_ExcludesDisabledOrganizations" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetUserInvitations"('outsider') AS "Invitations"
    WHERE "Invitations"."OrganizationUUID" = "test"."Fixture"('Organization.Disabled');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'an invitation into a disabled organization was offered to the user');
END;
$$ LANGUAGE plpgsql;

-- Anything AcceptOrganizationInvitation would refuse has no business in a list
-- of things to accept.
CREATE FUNCTION "test"."TestGetUserInvitations_ExcludesExpiredAndAnsweredInvitations" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    UPDATE "dbo"."Users" SET "Email" = 'stranger@example.test', "UpdatedBy" = 'test'
    WHERE "Users"."UserUUID" = "test"."Fixture"('User.Outsider');
    SELECT count(*) INTO _Count FROM "dbo"."GetUserInvitations"('outsider');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'an expired invitation was offered to the user');

    UPDATE "dbo"."Users" SET "Email" = 'nobody@example.test', "UpdatedBy" = 'test'
    WHERE "Users"."UserUUID" = "test"."Fixture"('User.Outsider');
    SELECT count(*) INTO _Count FROM "dbo"."GetUserInvitations"('outsider');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'a declined invitation was offered to the user again');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetUserInvitations_ReturnsNothingForSomebodyNobodyHasInvited" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetUserInvitations"('member');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetUserInvitations returned rows for a user nobody has invited');
END;
$$ LANGUAGE plpgsql;

-- Invitations are addressed to an email, so an account without one matches
-- nothing -- rather than matching every invitation whose address is blank.
CREATE FUNCTION "test"."TestGetUserInvitations_ReturnsNothingForAnAccountWithNoAddress" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    UPDATE "dbo"."Users" SET "Email" = '', "UpdatedBy" = 'test'
    WHERE "Users"."UserUUID" = "test"."Fixture"('User.Outsider');

    SELECT count(*) INTO _Count FROM "dbo"."GetUserInvitations"('outsider');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'an account with no email address matched invitations');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetUserInvitations_ReturnsNothingForADisabledAccount" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    UPDATE "dbo"."OrganizationInvitations" SET "Email" = 'disabled@example.test', "UpdatedBy" = 'test'
    WHERE "OrganizationInvitations"."InvitationUUID" = "test"."Fixture"('Invitation.Pending');

    SELECT count(*) INTO _Count FROM "dbo"."GetUserInvitations"('disabled');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'a disabled account was offered an invitation');
END;
$$ LANGUAGE plpgsql;
