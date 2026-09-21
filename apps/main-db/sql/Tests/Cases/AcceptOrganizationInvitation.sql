CREATE FUNCTION "test"."TestAcceptOrganizationInvitation_GrantsMembership" () RETURNS void AS $$
DECLARE
    _Invitation record;
BEGIN
    SELECT * INTO _Invitation FROM "dbo"."AcceptOrganizationInvitation"('outsider', "test"."Fixture"('Invitation.Pending'));

    PERFORM "test"."AssertTrue"(
        "dbo"."IsMemberOfOrganization"('outsider', "test"."Fixture"('Organization.Acme')),
        'accepting an invitation did not put the user into the organization'
    );
    PERFORM "test"."AssertEquals"(_Invitation."Status"::text, 'Accepted', 'the invitation was not marked Accepted');
    PERFORM "test"."AssertTrue"(_Invitation."RespondedAt" IS NOT NULL, 'an answered invitation should carry RespondedAt');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAcceptOrganizationInvitation_RecordsWhoAcceptedIt" () RETURNS void AS $$
DECLARE
    _AcceptedByUserUUID uuid;
BEGIN
    PERFORM "dbo"."AcceptOrganizationInvitation"('outsider', "test"."Fixture"('Invitation.Pending'));

    SELECT "OrganizationInvitations"."AcceptedByUserUUID" INTO _AcceptedByUserUUID
    FROM "dbo"."OrganizationInvitations"
    WHERE "OrganizationInvitations"."InvitationUUID" = "test"."Fixture"('Invitation.Pending');

    PERFORM "test"."AssertEquals"(_AcceptedByUserUUID, "test"."Fixture"('User.Outsider'), 'the invitation does not record who took it up');
END;
$$ LANGUAGE plpgsql;

-- The role is settled when the invitation is written, not when it is accepted,
-- so an invitation offering ownership produces an owner.
CREATE FUNCTION "test"."TestAcceptOrganizationInvitation_CarriesTheOfferedRole" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."AcceptOrganizationInvitation"('admin', "test"."Fixture"('Invitation.OwnerSeat'));

    PERFORM "test"."AssertTrue"(
        "dbo"."IsOwnerOfOrganization"('admin', "test"."Fixture"('Organization.Acme')),
        'an invitation offering ownership produced a plain member'
    );
END;
$$ LANGUAGE plpgsql;

-- An invitation belongs to an address, and the address belongs to an account.
-- Holding the identifier is not holding the invitation.
CREATE FUNCTION "test"."TestAcceptOrganizationInvitation_RejectsSomebodyElsesInvitation" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."AcceptOrganizationInvitation"(%L, %L)',
            'member', "test"."Fixture"('Invitation.Pending')
        ),
        'a user accepted an invitation addressed to somebody else',
        'Action cannot be performed.'
    );
    PERFORM "test"."AssertFalse"(
        "dbo"."IsMemberOfOrganization"('outsider', "test"."Fixture"('Organization.Acme')),
        'the rejected call still granted the membership'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAcceptOrganizationInvitation_RejectsAnExpiredInvitation" () RETURNS void AS $$
BEGIN
    -- The lapsed invitation is addressed to stranger@example.test. Reach it
    -- with an account that holds that address, or the address check refuses
    -- first and the expiry is never reached.
    UPDATE "dbo"."Users" SET "Email" = 'stranger@example.test', "UpdatedBy" = 'test'
    WHERE "Users"."UserUUID" = "test"."Fixture"('User.Outsider');

    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."AcceptOrganizationInvitation"(%L, %L)',
            'outsider', "test"."Fixture"('Invitation.Expired')
        ),
        'an expired invitation was accepted',
        'expired'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAcceptOrganizationInvitation_RejectsAnAlreadyAnsweredInvitation" () RETURNS void AS $$
BEGIN
    -- Declined belongs to nobody@example.test, so reach it with an account that
    -- holds that address rather than one that does not.
    UPDATE "dbo"."Users" SET "Email" = 'nobody@example.test', "UpdatedBy" = 'test'
    WHERE "Users"."UserUUID" = "test"."Fixture"('User.Outsider');

    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."AcceptOrganizationInvitation"(%L, %L)',
            'outsider', "test"."Fixture"('Invitation.Declined')
        ),
        'a declined invitation was accepted',
        'already been answered'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAcceptOrganizationInvitation_RejectsADisabledOrganization" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."AcceptOrganizationInvitation"(%L, %L)',
            'outsider', "test"."Fixture"('Invitation.DisabledOrg')
        ),
        'an invitation into a disabled organization was accepted',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAcceptOrganizationInvitation_RejectsADisabledAccount" () RETURNS void AS $$
BEGIN
    UPDATE "dbo"."OrganizationInvitations" SET "Email" = 'disabled@example.test', "UpdatedBy" = 'test'
    WHERE "OrganizationInvitations"."InvitationUUID" = "test"."Fixture"('Invitation.Pending');

    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."AcceptOrganizationInvitation"(%L, %L)',
            'disabled', "test"."Fixture"('Invitation.Pending')
        ),
        'a disabled account accepted an invitation',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;
