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

-- The one thing a new account is given an opinion about. Everything else on
-- dbo.UserProfiles is the profile form's and stays empty, but the members
-- list reads this column, so the answer for somebody who has just arrived is
-- written down rather than inferred.
CREATE FUNCTION "test"."TestProvisionUser_StartsTheNewAccountsAddressPrivate" () RETURNS void AS $$
DECLARE
    _User record;
    _Profile record;
BEGIN
    SELECT * INTO _User FROM "dbo"."ProvisionUser"('subject-newcomer', 'newcomer', 'New Comer', 'newcomer@example.test');

    PERFORM "test"."AssertRowCount"(
        format('SELECT * FROM "dbo"."UserProfiles" WHERE "UserUUID" = %L', _User."UserUUID"),
        1,
        'creating an account did not create its profile row'
    );

    SELECT * INTO _Profile FROM "dbo"."GetUserProfile"('newcomer');
    PERFORM "test"."AssertTrue"(_Profile."EmailIsPrivate", 'a new account''s address was not private');
END;
$$ LANGUAGE plpgsql;

-- Creation, not every sign-in. Somebody who has given their address away is
-- not handed the default back the next time they arrive.
CREATE FUNCTION "test"."TestProvisionUser_LeavesTheSwitchWhereItsOwnerPutIt" () RETURNS void AS $$
DECLARE
    _Profile record;
BEGIN
    PERFORM "dbo"."ProvisionUser"('subject-newcomer', 'newcomer', 'New Comer', 'newcomer@example.test');
    PERFORM "dbo"."SetUserEmailPrivacy"('newcomer', false);

    PERFORM "dbo"."ProvisionUser"('subject-newcomer', 'newcomer', 'New Comer', 'newcomer@example.test');

    SELECT * INTO _Profile FROM "dbo"."GetUserProfile"('newcomer');
    PERFORM "test"."AssertFalse"(_Profile."EmailIsPrivate", 'signing in again put the privacy switch back');
END;
$$ LANGUAGE plpgsql;

-- An account claimed by login name already exists, so it keeps whatever it
-- had: the insert above gives way rather than writing over a profile.
CREATE FUNCTION "test"."TestProvisionUser_DoesNotDisturbAClaimedAccountsProfile" () RETURNS void AS $$
DECLARE
    _Profile record;
BEGIN
    PERFORM "dbo"."SetUserProfile"(
        'outsider', 'Oscar', 'Outsider', 'Ozzy', '', '', 'Male', '',
        '', '', '', '', '', '', '', true, false
    );

    PERFORM "dbo"."ProvisionUser"('subject-outsider', 'outsider', 'Oscar Outsider', 'outsider@example.test');

    SELECT * INTO _Profile FROM "dbo"."GetUserProfile"('outsider');
    PERFORM "test"."AssertEquals"(_Profile."NickName"::text, 'Ozzy', 'claiming an account overwrote its profile');
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

--
-- The address list, which this function keeps in step with the token. Since
-- dbo.UserEmails exists, a sign-in has to leave dbo.Users."Email" and the
-- primary row saying the same thing.
--

CREATE FUNCTION "test"."TestProvisionUser_PutsTheTokensAddressOnTheList" () RETURNS void AS $$
DECLARE
    _Primary record;
BEGIN
    -- Admin has a "SubjectId" and no dbo.UserEmails row: the account that
    -- existed before this table did.
    PERFORM "dbo"."ProvisionUser"('subject-admin', 'admin', 'Ada Admin', 'admin@example.test', true);

    SELECT * INTO _Primary FROM "dbo"."GetUserEmails"('admin') WHERE "IsPrimary";

    PERFORM "test"."AssertEquals"(_Primary."Email"::text, 'admin@example.test', 'signing in did not put the token''s address on the list');
    PERFORM "test"."AssertTrue"(_Primary."IsVerified", 'an address the identity provider vouched for did not read as verified');
END;
$$ LANGUAGE plpgsql;

-- The claim is passed through rather than assumed. Keycloak can hold an
-- address nobody has confirmed, and the security page then offers to send a
-- link rather than showing a green tick it has not earned.
CREATE FUNCTION "test"."TestProvisionUser_LeavesAnUnconfirmedAddressUnverified" () RETURNS void AS $$
DECLARE
    _Primary record;
BEGIN
    PERFORM "dbo"."ProvisionUser"('subject-admin', 'admin', 'Ada Admin', 'admin@example.test', false);

    SELECT * INTO _Primary FROM "dbo"."GetUserEmails"('admin') WHERE "IsPrimary";

    PERFORM "test"."AssertFalse"(_Primary."IsVerified", 'an address the identity provider had not confirmed read as verified');
END;
$$ LANGUAGE plpgsql;

-- A link that was actually followed is stronger evidence than a claim on a
-- token, so a sign-in must never take a verified row back to unverified.
CREATE FUNCTION "test"."TestProvisionUser_NeverUnverifiesAnAddress" () RETURNS void AS $$
DECLARE
    _Primary record;
BEGIN
    PERFORM "dbo"."ProvisionUser"('subject-member', 'member', 'Marcus Member', 'member@example.test', false);

    SELECT * INTO _Primary FROM "dbo"."GetUserEmails"('member') WHERE "IsPrimary";

    PERFORM "test"."AssertTrue"(_Primary."IsVerified", 'signing in took a verified address back to unverified');
END;
$$ LANGUAGE plpgsql;

-- Changing the address at Keycloak and signing in has to move the primary
-- here, or the security page would show an address its owner no longer signs
-- in with.
CREATE FUNCTION "test"."TestProvisionUser_MovesThePrimaryWhenTheTokensAddressChanges" () RETURNS void AS $$
DECLARE
    _Primary record;
BEGIN
    PERFORM "dbo"."ProvisionUser"('subject-member', 'member', 'Marcus Member', 'marcus.work@example.test', true);

    SELECT * INTO _Primary FROM "dbo"."GetUserEmails"('member') WHERE "IsPrimary";

    PERFORM "test"."AssertEquals"(_Primary."UserEmailUUID", "test"."Fixture"('UserEmail.MemberWork'), 'the primary did not follow the token');
    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''member'') WHERE "IsPrimary"',
        1,
        'signing in left the account with the wrong number of primary addresses'
    );
END;
$$ LANGUAGE plpgsql;

-- An address Keycloak has never mentioned is added rather than replacing one:
-- the others are still addresses that reach this person.
CREATE FUNCTION "test"."TestProvisionUser_KeepsTheOtherAddressesOnTheList" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."ProvisionUser"('subject-member', 'member', 'Marcus Member', 'marcus.newest@example.test', true);

    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''member'')',
        5,
        'signing in with a new address discarded the others'
    );
END;
$$ LANGUAGE plpgsql;

-- An address on somebody else's account is left alone. Taking it would move an
-- address between accounts on a sign-in, which is the one thing the unique key
-- exists to prevent.
CREATE FUNCTION "test"."TestProvisionUser_WillNotTakeAnAddressFromAnotherAccount" () RETURNS void AS $$
DECLARE
    _User record;
BEGIN
    SELECT * INTO _User FROM "dbo"."ProvisionUser"('subject-owner', 'owner', 'Olivia Owner', 'member@example.test', true);

    -- The column still carries what the token said, so nothing the
    -- application reads is wrong.
    PERFORM "test"."AssertEquals"(_User."Email"::text, 'member@example.test', 'dbo.Users."Email" did not take the token''s address');

    -- The row stays where it was.
    PERFORM "test"."AssertRowCount"(
        format(
            'SELECT * FROM "dbo"."UserEmails" WHERE "Email" = ''member@example.test'' AND "UserUUID" = %L',
            "test"."Fixture"('User.Member')
        ),
        1,
        'a sign-in moved an address from one account to another'
    );
    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''owner'')',
        1,
        'the owner picked up an address belonging to the member'
    );
END;
$$ LANGUAGE plpgsql;

-- An account can exist with no address at all, and a row holding nothing would
-- fail the table's own check constraint.
CREATE FUNCTION "test"."TestProvisionUser_WritesNoAddressRowForATokenWithNoAddress" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."ProvisionUser"('subject-admin', 'admin', 'Ada Admin', '', true);

    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''admin'')',
        0,
        'a token with no address still wrote an address row'
    );
END;
$$ LANGUAGE plpgsql;

-- A first sign-in creates the account and its first address together.
CREATE FUNCTION "test"."TestProvisionUser_GivesABrandNewAccountItsFirstAddress" () RETURNS void AS $$
DECLARE
    _Primary record;
BEGIN
    PERFORM "dbo"."ProvisionUser"('subject-newcomer', 'newcomer', 'Nadia Newcomer', 'Nadia@Example.TEST', true);

    SELECT * INTO _Primary FROM "dbo"."GetUserEmails"('newcomer') WHERE "IsPrimary";

    -- Folded on the way in, the same as every other writer of this table.
    PERFORM "test"."AssertEquals"(_Primary."Email"::text, 'nadia@example.test', 'a new account''s first address was not folded');
    PERFORM "test"."AssertTrue"(_Primary."IsVerified", 'a new account''s confirmed address did not read as verified');
END;
$$ LANGUAGE plpgsql;

--
-- The token's issue time, which is what stops a new sign-in address from
-- undoing itself. A token is minted once and used until it expires, so the
-- next request after a change on the security page still carries the address
-- that was there before it.
--

-- The bug these exist for, in one test: choose a new primary, then arrive with
-- a token that was issued before the choice. The old address must not win.
CREATE FUNCTION "test"."TestProvisionUser_IgnoresAnAddressOnATokenThatPredatesIt" () RETURNS void AS $$
DECLARE
    _Issued TIMESTAMPTZ = CURRENT_TIMESTAMP - interval '10 minutes';
    _Primary record;
BEGIN
    PERFORM "dbo"."SetPrimaryUserEmail"('member', "test"."Fixture"('UserEmail.MemberWork'));

    PERFORM "dbo"."ProvisionUser"('subject-member', 'member', 'Marcus Member', 'member@example.test', true, _Issued);

    SELECT * INTO _Primary FROM "dbo"."GetUserEmails"('member') WHERE "IsPrimary";

    PERFORM "test"."AssertEquals"(_Primary."UserEmailUUID", "test"."Fixture"('UserEmail.MemberWork'), 'a token older than the change moved the primary back');
    PERFORM "test"."AssertEquals"(
        (SELECT "Users"."Email"::text FROM "dbo"."Users" WHERE "Users"."LoginName" = 'member'),
        'marcus.work@example.test',
        'a token older than the change moved dbo.Users."Email" back'
    );
END;
$$ LANGUAGE plpgsql;

-- Everything else on a stale token is still current: only the address is old.
-- A rename and a sign-in arriving together must not both be discarded.
CREATE FUNCTION "test"."TestProvisionUser_StillRefreshesTheRestFromAStaleToken" () RETURNS void AS $$
DECLARE
    _Issued TIMESTAMPTZ = CURRENT_TIMESTAMP - interval '10 minutes';
    _User record;
BEGIN
    PERFORM "dbo"."SetPrimaryUserEmail"('member', "test"."Fixture"('UserEmail.MemberWork'));

    SELECT * INTO _User FROM "dbo"."ProvisionUser"('subject-member', 'marcus', 'Marcus Renamed', 'member@example.test', true, _Issued);

    PERFORM "test"."AssertEquals"(_User."LoginName"::text, 'marcus', 'a stale token''s login name was discarded with its address');
    PERFORM "test"."AssertEquals"(_User."Name"::text, 'Marcus Renamed', 'a stale token''s display name was discarded with its address');
    PERFORM "test"."AssertEquals"(_User."Email"::text, 'marcus.work@example.test', 'the stale address was taken anyway');
END;
$$ LANGUAGE plpgsql;

-- The other direction, which is the case the copy exists for: an address
-- changed at Keycloak arrives on a token minted after the change, and that one
-- does win.
CREATE FUNCTION "test"."TestProvisionUser_TakesAnAddressOnATokenIssuedAfterTheChange" () RETURNS void AS $$
DECLARE
    _Primary record;
BEGIN
    PERFORM "dbo"."SetPrimaryUserEmail"('member', "test"."Fixture"('UserEmail.MemberWork'));

    -- A token minted now, which is after the write above.
    PERFORM "dbo"."ProvisionUser"('subject-member', 'member', 'Marcus Member', 'member@example.test', true, CURRENT_TIMESTAMP + interval '1 second');

    SELECT * INTO _Primary FROM "dbo"."GetUserEmails"('member') WHERE "IsPrimary";

    PERFORM "test"."AssertEquals"(_Primary."UserEmailUUID", "test"."Fixture"('UserEmail.MemberPrimary'), 'a token newer than the change did not move the primary');
END;
$$ LANGUAGE plpgsql;

-- A caller that does not say when its token was issued gets the old behavior,
-- which is that the token is current. Every caller in this repository passes
-- one; the default is for anything that has not been taught to.
CREATE FUNCTION "test"."TestProvisionUser_TreatsAnUnknownIssueTimeAsCurrent" () RETURNS void AS $$
DECLARE
    _Primary record;
BEGIN
    PERFORM "dbo"."SetPrimaryUserEmail"('member', "test"."Fixture"('UserEmail.MemberWork'));

    PERFORM "dbo"."ProvisionUser"('subject-member', 'member', 'Marcus Member', 'member@example.test', true);

    SELECT * INTO _Primary FROM "dbo"."GetUserEmails"('member') WHERE "IsPrimary";

    PERFORM "test"."AssertEquals"(_Primary."UserEmailUUID", "test"."Fixture"('UserEmail.MemberPrimary'), 'a token with no issue time was not treated as current');
END;
$$ LANGUAGE plpgsql;

-- An account with no rows in dbo.UserEmails has no address to be stale about,
-- so a token for one is always current. This is the account that predates the
-- table.
CREATE FUNCTION "test"."TestProvisionUser_HasNothingToBeStaleAboutWithNoAddressRows" () RETURNS void AS $$
DECLARE
    _Primary record;
BEGIN
    PERFORM "dbo"."ProvisionUser"('subject-admin', 'admin', 'Ada Admin', 'admin@example.test', true, CURRENT_TIMESTAMP - interval '10 minutes');

    SELECT * INTO _Primary FROM "dbo"."GetUserEmails"('admin') WHERE "IsPrimary";

    PERFORM "test"."AssertEquals"(_Primary."Email"::text, 'admin@example.test', 'an account with no address rows did not take the token''s address');
END;
$$ LANGUAGE plpgsql;
