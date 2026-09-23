--
-- The security page's "keep my email addresses private" switch: that it can be
-- set before a profile exists, that it survives a profile save, and that it
-- actually withholds the address.
--

CREATE FUNCTION "test"."TestSetUserEmailPrivacy_TurnsTheSwitchOnAndOffAgain" () RETURNS void AS $$
DECLARE
    _Setting record;
BEGIN
    SELECT * INTO _Setting FROM "dbo"."SetUserEmailPrivacy"('member', true);
    PERFORM "test"."AssertTrue"(_Setting."EmailIsPrivate", 'the switch did not turn on');

    SELECT * INTO _Setting FROM "dbo"."SetUserEmailPrivacy"('member', false);
    PERFORM "test"."AssertFalse"(_Setting."EmailIsPrivate", 'the switch did not turn off again');
END;
$$ LANGUAGE plpgsql;

-- The member has no dbo.UserProfiles row in the fixtures, which is the state
-- of every account that has never opened the profile page. A switch on the
-- security page must not be the thing that refuses.
CREATE FUNCTION "test"."TestSetUserEmailPrivacy_CreatesTheProfileRowWhenThereIsNone" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRowCount"(
        format('SELECT * FROM "dbo"."UserProfiles" WHERE "UserUUID" = %L', "test"."Fixture"('User.Member')),
        0,
        'the member already had a profile row, so this test proves nothing'
    );

    PERFORM "dbo"."SetUserEmailPrivacy"('member', true);

    PERFORM "test"."AssertRowCount"(
        format('SELECT * FROM "dbo"."UserProfiles" WHERE "UserUUID" = %L AND "EmailIsPrivate"', "test"."Fixture"('User.Member')),
        1,
        'the switch did not create a profile row'
    );
END;
$$ LANGUAGE plpgsql;

-- The two live on one table and belong to two pages. Neither may overwrite the
-- other, which is why dbo.SetUserProfile leaves this column out of its
-- conflict clause and this function writes only it.
CREATE FUNCTION "test"."TestSetUserEmailPrivacy_SurvivesAProfileSave" () RETURNS void AS $$
DECLARE
    _Profile record;
BEGIN
    PERFORM "dbo"."SetUserEmailPrivacy"('member', true);

    PERFORM "dbo"."SetUserProfile"(
        'member', 'Marcus', 'Member', '', '', '', 'Male', '',
        '', '', '', '', '', '', '', true, false
    );

    SELECT * INTO _Profile FROM "dbo"."GetUserProfile"('member');

    PERFORM "test"."AssertTrue"(_Profile."EmailIsPrivate", 'saving the profile form turned the privacy switch off');
    PERFORM "test"."AssertEquals"(_Profile."FirstName"::text, 'Marcus', 'the profile did not save');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSetUserEmailPrivacy_LeavesTheRestOfTheProfileAlone" () RETURNS void AS $$
DECLARE
    _Profile record;
BEGIN
    PERFORM "dbo"."SetUserProfile"(
        'member', 'Marcus', 'Member', 'Marc', 'Program manager',
        'Runs the scoreboard.', 'Male', '1990-04-17',
        '+1 555 0134', 'San Francisco, CA',
        '', '', '', '', '', false, true
    );

    PERFORM "dbo"."SetUserEmailPrivacy"('member', true);

    SELECT * INTO _Profile FROM "dbo"."GetUserProfile"('member');

    PERFORM "test"."AssertEquals"(_Profile."NickName"::text, 'Marc', 'the switch cleared the nickname');
    PERFORM "test"."AssertEquals"(_Profile."Biography"::text, 'Runs the scoreboard.', 'the switch cleared the biography');
    PERFORM "test"."AssertFalse"(_Profile."WantsAwardEmails", 'the switch reset the award mail preference');
    PERFORM "test"."AssertTrue"(_Profile."WantsDigestEmails", 'the switch reset the digest preference');
END;
$$ LANGUAGE plpgsql;

-- Off by default, so nothing changes for an account that has never touched it.
CREATE FUNCTION "test"."TestSetUserEmailPrivacy_IsOffUntilSomebodyTurnsItOn" () RETURNS void AS $$
DECLARE
    _Profile record;
BEGIN
    SELECT * INTO _Profile FROM "dbo"."GetUserProfile"('member');

    PERFORM "test"."AssertFalse"(_Profile."EmailIsPrivate", 'the privacy switch defaulted to on');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSetUserEmailPrivacy_RefusesAnUnknownAccount" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."SetUserEmailPrivacy"(%L, true)', 'nobody'),
        'an unknown account set a privacy switch',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;
