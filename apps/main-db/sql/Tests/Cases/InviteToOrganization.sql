CREATE FUNCTION "test"."TestInviteToOrganization_CreatesAPendingInvitation" () RETURNS void AS $$
DECLARE
    _Invitation record;
BEGIN
    SELECT * INTO _Invitation FROM "dbo"."InviteToOrganization"('owner', "test"."Fixture"('Organization.Acme'), 'newcomer@example.test');

    PERFORM "test"."AssertEquals"(_Invitation."Status"::text, 'Pending', 'a new invitation should be Pending');
    PERFORM "test"."AssertEquals"(_Invitation."Email"::text, 'newcomer@example.test', 'the invitation went to the wrong address');
    PERFORM "test"."AssertEquals"(_Invitation."OrganizationName"::text, 'Acme', 'the invitation names the wrong organization');
    PERFORM "test"."AssertEquals"(_Invitation."InvitedByLoginName"::text, 'owner', 'the invitation records the wrong inviter');
    PERFORM "test"."AssertFalse"(_Invitation."IsOwner", 'an invitation should offer plain membership unless asked otherwise');
    PERFORM "test"."AssertEquals"(_Invitation."RespondedAt", NULL::timestamptz, 'an unanswered invitation should have no RespondedAt');
END;
$$ LANGUAGE plpgsql;

-- Inviting somebody is not adding them. Nothing reaches dbo.UserOrganizations
-- until the invitee accepts, which is the whole difference from the function
-- this replaced.
CREATE FUNCTION "test"."TestInviteToOrganization_DoesNotGrantMembership" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."InviteToOrganization"('owner', "test"."Fixture"('Organization.Acme'), 'outsider@example.test');

    PERFORM "test"."AssertFalse"(
        "dbo"."IsMemberOfOrganization"('outsider', "test"."Fixture"('Organization.Acme')),
        'being invited put the user into the organization'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestInviteToOrganization_CanOfferOwnership" () RETURNS void AS $$
DECLARE
    _Invitation record;
BEGIN
    SELECT * INTO _Invitation FROM "dbo"."InviteToOrganization"('owner', "test"."Fixture"('Organization.Acme'), 'newcomer@example.test', true);
    PERFORM "test"."AssertTrue"(_Invitation."IsOwner", 'the invitation did not carry the offered ownership');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestInviteToOrganization_RejectsANonOwner" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."InviteToOrganization"(%L, %L, %L)',
            'member', "test"."Fixture"('Organization.Acme'), 'newcomer@example.test'
        ),
        'a plain member was allowed to invite people into the organization',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

-- Re-inviting is how an owner reaches somebody who declined, and how they
-- change the offered role before it is taken up. It updates the one row rather
-- than stacking a second offer beside it.
CREATE FUNCTION "test"."TestInviteToOrganization_ReplacesAnExistingInvitation" () RETURNS void AS $$
DECLARE
    _Invitation record;
    _Count bigint;
BEGIN
    SELECT * INTO _Invitation FROM "dbo"."InviteToOrganization"('owner', "test"."Fixture"('Organization.Acme'), 'nobody@example.test', true);

    PERFORM "test"."AssertEquals"(_Invitation."InvitationUUID", "test"."Fixture"('Invitation.Declined'), 're-inviting created a new invitation instead of reusing the row');
    PERFORM "test"."AssertEquals"(_Invitation."Status"::text, 'Pending', 're-inviting did not put the declined invitation back to Pending');
    PERFORM "test"."AssertTrue"(_Invitation."IsOwner", 're-inviting did not take the newly offered role');
    PERFORM "test"."AssertEquals"(_Invitation."RespondedAt", NULL::timestamptz, 're-inviting left the earlier answer in place');

    SELECT count(*) INTO _Count FROM "dbo"."OrganizationInvitations"
    WHERE "OrganizationInvitations"."OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "OrganizationInvitations"."Email" = 'nobody@example.test';
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'the organization holds two invitations for one address');
END;
$$ LANGUAGE plpgsql;

-- An invitation to somebody already inside can never be usefully accepted, so
-- it is refused rather than left to sit as a permanently pointless Pending row.
CREATE FUNCTION "test"."TestInviteToOrganization_RejectsAnExistingMember" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."InviteToOrganization"(%L, %L, %L)',
            'owner', "test"."Fixture"('Organization.Acme'), 'member@example.test'
        ),
        'an existing member was invited again',
        'already a member'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestInviteToOrganization_RejectsAnUnusableAddress" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."InviteToOrganization"(%L, %L, %L)', 'owner', "test"."Fixture"('Organization.Acme'), '   '),
        'a blank address was accepted',
        'An email address is required.'
    );
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."InviteToOrganization"(%L, %L, %L)', 'owner', "test"."Fixture"('Organization.Acme'), 'not-an-address'),
        'an address with no @ was accepted',
        'An email address is required.'
    );
END;
$$ LANGUAGE plpgsql;

-- The address is folded on the way in, so the comparison
-- AcceptOrganizationInvitation makes against the account's address lines up
-- whatever case the owner typed.
CREATE FUNCTION "test"."TestInviteToOrganization_FoldsTheAddressToLowerCase" () RETURNS void AS $$
DECLARE
    _Invitation record;
BEGIN
    SELECT * INTO _Invitation FROM "dbo"."InviteToOrganization"('owner', "test"."Fixture"('Organization.Acme'), '  NewComer@Example.TEST  ');
    PERFORM "test"."AssertEquals"(_Invitation."Email"::text, 'newcomer@example.test', 'the address was not folded and trimmed');
END;
$$ LANGUAGE plpgsql;

-- IsOwnerOfOrganization requires the organization to be enabled, so an owner of
-- a disabled organization cannot invite anybody into it.
CREATE FUNCTION "test"."TestInviteToOrganization_RejectsADisabledOrganization" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."InviteToOrganization"(%L, %L, %L)',
            'owner', "test"."Fixture"('Organization.Disabled'), 'newcomer@example.test'
        ),
        'an invitation was issued into a disabled organization',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;
