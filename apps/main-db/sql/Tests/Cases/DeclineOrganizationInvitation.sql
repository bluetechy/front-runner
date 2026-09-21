CREATE FUNCTION "test"."TestDeclineOrganizationInvitation_AnswersWithoutJoining" () RETURNS void AS $$
DECLARE
    _Invitation record;
BEGIN
    SELECT * INTO _Invitation FROM "dbo"."DeclineOrganizationInvitation"('outsider', "test"."Fixture"('Invitation.Pending'));

    PERFORM "test"."AssertEquals"(_Invitation."Status"::text, 'Declined', 'the invitation was not marked Declined');
    PERFORM "test"."AssertTrue"(_Invitation."RespondedAt" IS NOT NULL, 'a declined invitation should carry RespondedAt');
    PERFORM "test"."AssertFalse"(
        "dbo"."IsMemberOfOrganization"('outsider', "test"."Fixture"('Organization.Acme')),
        'declining an invitation still granted the membership'
    );
END;
$$ LANGUAGE plpgsql;

-- The row is kept rather than deleted: the owner gets to see the answer, and
-- dbo.InviteToOrganization reuses it to ask again.
CREATE FUNCTION "test"."TestDeclineOrganizationInvitation_KeepsTheRow" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    PERFORM "dbo"."DeclineOrganizationInvitation"('outsider', "test"."Fixture"('Invitation.Pending'));

    SELECT count(*) INTO _Count FROM "dbo"."OrganizationInvitations"
    WHERE "OrganizationInvitations"."InvitationUUID" = "test"."Fixture"('Invitation.Pending');
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'declining deleted the invitation instead of answering it');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestDeclineOrganizationInvitation_RejectsSomebodyElsesInvitation" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."DeclineOrganizationInvitation"(%L, %L)',
            'member', "test"."Fixture"('Invitation.Pending')
        ),
        'a user declined an invitation addressed to somebody else',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestDeclineOrganizationInvitation_RejectsAnAlreadyAnsweredInvitation" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."DeclineOrganizationInvitation"('outsider', "test"."Fixture"('Invitation.Pending'));

    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."DeclineOrganizationInvitation"(%L, %L)',
            'outsider', "test"."Fixture"('Invitation.Pending')
        ),
        'the same invitation was declined twice',
        'already been answered'
    );
END;
$$ LANGUAGE plpgsql;
