CREATE FUNCTION "test"."TestRevokeOrganizationInvitation_WithdrawsAPendingInvitation" () RETURNS void AS $$
DECLARE
    _Invitation record;
BEGIN
    SELECT * INTO _Invitation FROM "dbo"."RevokeOrganizationInvitation"('owner', "test"."Fixture"('Invitation.Pending'));

    PERFORM "test"."AssertEquals"(_Invitation."Status"::text, 'Revoked', 'the invitation was not marked Revoked');
    PERFORM "test"."AssertTrue"(_Invitation."RespondedAt" IS NOT NULL, 'a revoked invitation should carry RespondedAt');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestRevokeOrganizationInvitation_ClosesTheInvitationOff" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."RevokeOrganizationInvitation"('owner', "test"."Fixture"('Invitation.Pending'));

    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."AcceptOrganizationInvitation"(%L, %L)',
            'outsider', "test"."Fixture"('Invitation.Pending')
        ),
        'a revoked invitation could still be accepted',
        'already been answered'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestRevokeOrganizationInvitation_RejectsANonOwner" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."RevokeOrganizationInvitation"(%L, %L)',
            'member', "test"."Fixture"('Invitation.Pending')
        ),
        'a plain member withdrew an invitation',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

-- Withdrawing an accepted invitation would suggest the membership goes with
-- it. It does not -- removing a member is dbo.LeaveOrganization.
CREATE FUNCTION "test"."TestRevokeOrganizationInvitation_RejectsAnAlreadyAnsweredInvitation" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."AcceptOrganizationInvitation"('outsider', "test"."Fixture"('Invitation.Pending'));

    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."RevokeOrganizationInvitation"(%L, %L)',
            'owner', "test"."Fixture"('Invitation.Pending')
        ),
        'an accepted invitation was withdrawn',
        'already been answered'
    );
    PERFORM "test"."AssertTrue"(
        "dbo"."IsMemberOfOrganization"('outsider', "test"."Fixture"('Organization.Acme')),
        'the rejected call still removed the membership'
    );
END;
$$ LANGUAGE plpgsql;
