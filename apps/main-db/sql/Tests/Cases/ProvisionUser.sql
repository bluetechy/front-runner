CREATE FUNCTION "test"."TestProvisionUser_ReturnsTheAccountBehindAKnownSubject" () RETURNS void AS $$
DECLARE
    _User record;
    _Before bigint;
    _After bigint;
BEGIN
    SELECT count(*) INTO _Before FROM "dbo"."Users";
    SELECT * INTO _User FROM "dbo"."ProvisionUser"('subject-member', 'member', 'Marcus Member', 'member@example.test');
    SELECT count(*) INTO _After FROM "dbo"."Users";

    PERFORM "test"."AssertEquals"(_User."UserUUID", "test"."Fixture"('User.Member'), 'ProvisionUser returned the wrong account for a known subject');
    PERFORM "test"."AssertEquals"(_After, _Before, 'ProvisionUser created a second account for a subject it already knew');
END;
$$ LANGUAGE plpgsql;

-- The subject is the identity, not the username. Keycloak lets a user rename
-- themselves, and that has to land on the same row rather than a new one.
CREATE FUNCTION "test"."TestProvisionUser_FollowsARenamedLoginName" () RETURNS void AS $$
DECLARE
    _User record;
    _Before bigint;
    _After bigint;
BEGIN
    SELECT count(*) INTO _Before FROM "dbo"."Users";
    SELECT * INTO _User FROM "dbo"."ProvisionUser"('subject-member', 'marcus', 'Marcus Member', 'marcus@example.test');
    SELECT count(*) INTO _After FROM "dbo"."Users";

    PERFORM "test"."AssertEquals"(_User."UserUUID", "test"."Fixture"('User.Member'), 'a renamed user landed on a different account');
    PERFORM "test"."AssertEquals"(_User."LoginName"::text, 'marcus', 'ProvisionUser did not take the new login name');
    PERFORM "test"."AssertEquals"(_User."Email"::text, 'marcus@example.test', 'ProvisionUser did not take the new email');
    PERFORM "test"."AssertEquals"(_After, _Before, 'renaming a user created a second account');
END;
$$ LANGUAGE plpgsql;

-- Outsider is the fixture account with no subject: the shape of every row that
-- existed before Keycloak did.
CREATE FUNCTION "test"."TestProvisionUser_ClaimsAnAccountThatPredatesKeycloak" () RETURNS void AS $$
DECLARE
    _User record;
    _SubjectId varchar(255);
    _Before bigint;
    _After bigint;
BEGIN
    SELECT count(*) INTO _Before FROM "dbo"."Users";
    SELECT * INTO _User FROM "dbo"."ProvisionUser"('subject-outsider', 'outsider', 'Oscar Outsider', 'outsider@example.test');
    SELECT count(*) INTO _After FROM "dbo"."Users";

    PERFORM "test"."AssertEquals"(_User."UserUUID", "test"."Fixture"('User.Outsider'), 'ProvisionUser did not claim the existing account');
    PERFORM "test"."AssertEquals"(_After, _Before, 'claiming an existing account created a duplicate');

    SELECT "Users"."SubjectId" INTO _SubjectId FROM "dbo"."Users" WHERE "Users"."UserUUID" = "test"."Fixture"('User.Outsider');
    PERFORM "test"."AssertEquals"(_SubjectId::text, 'subject-outsider', 'the claimed account did not keep the subject');
END;
$$ LANGUAGE plpgsql;

-- An account that already belongs to somebody else's subject is not up for
-- grabs, however convincing the login name is.
CREATE FUNCTION "test"."TestProvisionUser_WillNotClaimAnAccountAnotherSubjectHolds" () RETURNS void AS $$
BEGIN
    -- The claim-by-login-name path only fires on a NULL subject, so this falls
    -- through to the insert and the login name's unique key stops it there.
    PERFORM "test"."AssertRaises"(
        'SELECT * FROM "dbo"."ProvisionUser"(''subject-impostor'', ''member'', ''Not Marcus'', ''impostor@example.test'')',
        'ProvisionUser handed over an account that another subject already held'
    );
    PERFORM "test"."AssertEquals"(
        "dbo"."GetUserUUID"('member'),
        "test"."Fixture"('User.Member'),
        'the rejected call still moved the account'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestProvisionUser_CreatesAnAccountForANewSubject" () RETURNS void AS $$
DECLARE
    _User record;
    _Before bigint;
    _After bigint;
BEGIN
    SELECT count(*) INTO _Before FROM "dbo"."Users";
    SELECT * INTO _User FROM "dbo"."ProvisionUser"('subject-newcomer', 'newcomer', 'New Comer', 'newcomer@example.test');
    SELECT count(*) INTO _After FROM "dbo"."Users";

    PERFORM "test"."AssertEquals"(_After, _Before + 1, 'ProvisionUser did not create an account for an unknown subject');
    PERFORM "test"."AssertEquals"(_User."LoginName"::text, 'newcomer', 'the new account has the wrong login name');
    PERFORM "test"."AssertEquals"(_User."Name"::text, 'New Comer', 'the new account has the wrong name');
    PERFORM "test"."AssertTrue"(_User."IsEnabled", 'a new account should be enabled');
    PERFORM "test"."AssertFalse"(_User."IsAdmin", 'a new account should not be an admin');
END;
$$ LANGUAGE plpgsql;

-- A brand new account has nothing but itself: no organization, no team. That
-- is the whole point of the model -- membership is granted separately, by
-- invitation.
CREATE FUNCTION "test"."TestProvisionUser_JoinsTheNewAccountToNothing" () RETURNS void AS $$
DECLARE
    _User record;
    _Count bigint;
BEGIN
    SELECT * INTO _User FROM "dbo"."ProvisionUser"('subject-newcomer', 'newcomer', 'New Comer', 'newcomer@example.test');

    SELECT count(*) INTO _Count FROM "dbo"."UserOrganizations" WHERE "UserOrganizations"."UserUUID" = _User."UserUUID";
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'a new account was put into an organization');
END;
$$ LANGUAGE plpgsql;

-- A name Keycloak did not send falls back to the login name rather than
-- writing an empty string into a NOT NULL column.
CREATE FUNCTION "test"."TestProvisionUser_FallsBackToTheLoginNameForADisplayName" () RETURNS void AS $$
DECLARE
    _User record;
BEGIN
    SELECT * INTO _User FROM "dbo"."ProvisionUser"('subject-nameless', 'nameless', NULL, NULL);
    PERFORM "test"."AssertEquals"(_User."Name"::text, 'nameless', 'ProvisionUser did not fall back to the login name');
    PERFORM "test"."AssertEquals"(_User."Email"::text, '', 'a missing email should be the empty default, not NULL');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestProvisionUser_RejectsAMissingSubjectOrLoginName" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        'SELECT * FROM "dbo"."ProvisionUser"(NULL, ''somebody'', ''Some Body'', ''somebody@example.test'')',
        'ProvisionUser accepted an identity with no subject',
        'A subject is required.'
    );
    PERFORM "test"."AssertRaises"(
        'SELECT * FROM "dbo"."ProvisionUser"(''subject-blank'', ''   '', ''Some Body'', ''somebody@example.test'')',
        'ProvisionUser accepted an identity with no login name',
        'A login name is required.'
    );
END;
$$ LANGUAGE plpgsql;

-- ProvisionUser maps a verified identity onto a row; it does not decide whether
-- that account may do anything. A disabled account still resolves, and the
-- caller is the one that has to look at IsEnabled -- which is why the function
-- returns it.
CREATE FUNCTION "test"."TestProvisionUser_StillResolvesADisabledAccount" () RETURNS void AS $$
DECLARE
    _User record;
BEGIN
    SELECT * INTO _User FROM "dbo"."ProvisionUser"('subject-disabled', 'disabled', 'Dana Disabled', 'disabled@example.test');
    PERFORM "test"."AssertEquals"(_User."UserUUID", "test"."Fixture"('User.Disabled'), 'ProvisionUser did not resolve the disabled account');
    PERFORM "test"."AssertFalse"(_User."IsEnabled", 'ProvisionUser reported a disabled account as enabled');
END;
$$ LANGUAGE plpgsql;
