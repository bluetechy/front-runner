--
-- What the table's own columns mean, as opposed to what any one function does
-- with them.
--

-- One row per address per organization. The status lives on that row, so the
-- table answers "where does this address stand with this organization" once,
-- rather than leaving a caller to work it out from a pile of offers.
CREATE FUNCTION "test"."TestOrganizationInvitations_HoldOneRowPerAddressPerOrganization" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."OrganizationInvitations" ("OrganizationUUID", "Email", "InvitedByUserUUID", "CreatedBy") VALUES (%L, %L, %L, ''test'')',
            "test"."Fixture"('Organization.Acme'), 'outsider@example.test', "test"."Fixture"('User.Owner')
        ),
        'the same address was invited into the same organization twice'
    );
END;
$$ LANGUAGE plpgsql;

-- The same address can be invited into as many organizations as care to ask.
-- An account is not tied to one of them.
CREATE FUNCTION "test"."TestOrganizationInvitations_AllowTheSameAddressInSeveralOrganizations" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."OrganizationInvitations"
    WHERE "OrganizationInvitations"."Email" = 'outsider@example.test';
    PERFORM "test"."AssertEquals"(_Count, 2::bigint, 'one address should be able to hold an invitation from each organization');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestOrganizationInvitations_RejectAStatusOutsideTheLifecycle" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."OrganizationInvitations" ("OrganizationUUID", "Email", "Status", "InvitedByUserUUID", "CreatedBy") VALUES (%L, %L, ''Maybe'', %L, ''test'')',
            "test"."Fixture"('Organization.Acme'), 'somebody@example.test', "test"."Fixture"('User.Owner')
        ),
        'an invitation was written with a status outside the lifecycle'
    );
END;
$$ LANGUAGE plpgsql;

-- An invitation expires on its own. Nothing sweeps the table, so the row stays
-- Pending forever and "is it still open" is ExpiresAt, not Status alone --
-- which is why every reader tests both.
CREATE FUNCTION "test"."TestOrganizationInvitations_LapseWithoutChangingStatus" () RETURNS void AS $$
DECLARE
    _Invitation record;
BEGIN
    SELECT "OrganizationInvitations"."Status", "OrganizationInvitations"."ExpiresAt", "OrganizationInvitations"."RespondedAt"
    INTO _Invitation
    FROM "dbo"."OrganizationInvitations"
    WHERE "OrganizationInvitations"."InvitationUUID" = "test"."Fixture"('Invitation.Expired');

    PERFORM "test"."AssertEquals"(_Invitation."Status"::text, 'Pending', 'a lapsed invitation should still read as Pending');
    PERFORM "test"."AssertTrue"(_Invitation."ExpiresAt" < CURRENT_TIMESTAMP, 'the lapsed fixture has not actually lapsed');
    PERFORM "test"."AssertEquals"(_Invitation."RespondedAt", NULL::timestamptz, 'nobody answered the lapsed invitation, so RespondedAt should be NULL');
END;
$$ LANGUAGE plpgsql;

-- A fresh invitation gets a fortnight by default, so a caller that does not
-- set ExpiresAt still writes something that closes.
CREATE FUNCTION "test"."TestOrganizationInvitations_ExpireAFortnightOutByDefault" () RETURNS void AS $$
DECLARE
    _ExpiresAt timestamptz;
BEGIN
    INSERT INTO "dbo"."OrganizationInvitations" ("OrganizationUUID", "Email", "InvitedByUserUUID", "CreatedBy")
    VALUES ("test"."Fixture"('Organization.Acme'), 'somebody@example.test', "test"."Fixture"('User.Owner'), 'test')
    RETURNING "OrganizationInvitations"."ExpiresAt" INTO _ExpiresAt;

    PERFORM "test"."AssertEquals"(_ExpiresAt, CURRENT_TIMESTAMP + interval '14 days', 'a new invitation did not get the default fortnight');
END;
$$ LANGUAGE plpgsql;

-- AcceptedByUserUUID is the account, not the address: a user can change their
-- email afterwards and the record of who joined has to survive that.
CREATE FUNCTION "test"."TestOrganizationInvitations_RecordTheAccountThatAcceptedNotTheAddress" () RETURNS void AS $$
DECLARE
    _AcceptedByUserUUID uuid;
BEGIN
    PERFORM "dbo"."AcceptOrganizationInvitation"('outsider', "test"."Fixture"('Invitation.Pending'));
    UPDATE "dbo"."Users" SET "Email" = 'moved-on@example.test', "UpdatedBy" = 'test'
    WHERE "Users"."UserUUID" = "test"."Fixture"('User.Outsider');

    SELECT "OrganizationInvitations"."AcceptedByUserUUID" INTO _AcceptedByUserUUID
    FROM "dbo"."OrganizationInvitations"
    WHERE "OrganizationInvitations"."InvitationUUID" = "test"."Fixture"('Invitation.Pending');
    PERFORM "test"."AssertEquals"(_AcceptedByUserUUID, "test"."Fixture"('User.Outsider'), 'changing an address lost the record of who accepted');
END;
$$ LANGUAGE plpgsql;
