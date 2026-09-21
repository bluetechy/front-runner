-- Four invitations sit against Acme in the fixtures: one waiting, one offering
-- ownership, one lapsed and one declined. The owner's view shows all four,
-- because "who have we asked" includes the ones who said no.
CREATE FUNCTION "test"."TestGetOrganizationInvitations_ReturnsEveryInvitationWhateverItsState" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetOrganizationInvitations"('owner', "test"."Fixture"('Organization.Acme'));
    PERFORM "test"."AssertEquals"(_Count, 4::bigint, 'the owner should see every invitation the organization has issued');

    SELECT count(*) INTO _Count FROM "dbo"."GetOrganizationInvitations"('owner', "test"."Fixture"('Organization.Acme')) AS "Invitations"
    WHERE "Invitations"."Status" = 'Declined';
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'the declined invitation is missing from the owner view');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetOrganizationInvitations_OnlyCoversTheNamedOrganization" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetOrganizationInvitations"('owner', "test"."Fixture"('Organization.Acme')) AS "Invitations"
    WHERE "Invitations"."OrganizationUUID" != "test"."Fixture"('Organization.Acme');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'the owner view leaked another organization''s invitations');
END;
$$ LANGUAGE plpgsql;

-- An empty list would read as "nobody has been invited", which is a different
-- and much more reassuring answer than "you cannot see this".
CREATE FUNCTION "test"."TestGetOrganizationInvitations_RaisesForANonOwnerRatherThanReturningNothing" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."GetOrganizationInvitations"(%L, %L)',
            'member', "test"."Fixture"('Organization.Acme')
        ),
        'a plain member could read the organization''s invitations',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;
