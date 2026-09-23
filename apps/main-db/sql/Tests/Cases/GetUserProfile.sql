--
-- What a profile reads as before anybody has written one, and after.
--

-- The case a first visit to the profile page hits: the account exists, the
-- dbo.UserProfiles row does not, and the answer is a full row of empties
-- rather than no row at all.
CREATE FUNCTION "test"."TestGetUserProfile_ReturnsEmptyFieldsForAnUneditedProfile" () RETURNS void AS $$
DECLARE
    _Profile record;
BEGIN
    SELECT * INTO _Profile FROM "dbo"."GetUserProfile"('member');

    PERFORM "test"."AssertEquals"(_Profile."UserUUID", "test"."Fixture"('User.Member'), 'GetUserProfile answered for the wrong user');
    PERFORM "test"."AssertEquals"(_Profile."FirstName"::text, '', 'an unedited profile came back with a first name');
    PERFORM "test"."AssertEquals"(_Profile."LastName"::text, '', 'an unedited profile came back with a last name');
    PERFORM "test"."AssertEquals"(_Profile."Biography"::text, '', 'an unedited profile came back with a biography');
    PERFORM "test"."AssertEquals"(_Profile."Gender"::text, 'Not specified', 'an unedited profile did not come back as unspecified');
    PERFORM "test"."AssertTrue"(_Profile."BirthDate" IS NULL, 'an unedited profile came back with a birth date');
    PERFORM "test"."AssertTrue"(_Profile."WantsAwardEmails", 'award emails did not default to on');
    PERFORM "test"."AssertFalse"(_Profile."WantsDigestEmails", 'the weekly digest did not default to off');
    -- Not an empty, and the one answer on this row that is a promise: an
    -- account nobody has asked has not offered its address to anybody.
    PERFORM "test"."AssertTrue"(_Profile."EmailIsPrivate", 'an unedited profile came back sharing its address');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetUserProfile_ReturnsWhatWasSaved" () RETURNS void AS $$
DECLARE
    _Profile record;
BEGIN
    PERFORM "dbo"."SetUserProfile"(
        'member', 'Marcus', 'Member', 'Marc', 'Program manager',
        'Runs the scoreboard.', 'Male', '1990-04-17',
        '+1 555 0134', 'San Francisco, CA',
        'facebook.com/marcus', 'github.com/marcus',
        'linkedin.com/in/marcus', 'tiktok.com/@marcus',
        'twitter.com/marcus', false, true
    );

    SELECT * INTO _Profile FROM "dbo"."GetUserProfile"('member');

    PERFORM "test"."AssertEquals"(_Profile."FirstName"::text, 'Marcus', 'the saved first name did not come back');
    PERFORM "test"."AssertEquals"(_Profile."NickName"::text, 'Marc', 'the saved nickname did not come back');
    PERFORM "test"."AssertEquals"(_Profile."Designation"::text, 'Program manager', 'the saved designation did not come back');
    PERFORM "test"."AssertEquals"(_Profile."Gender"::text, 'Male', 'the saved gender did not come back');
    PERFORM "test"."AssertEquals"(_Profile."Github"::text, 'github.com/marcus', 'the saved GitHub handle did not come back');
    PERFORM "test"."AssertEquals"(_Profile."TikTok"::text, 'tiktok.com/@marcus', 'the saved TikTok handle did not come back');
    PERFORM "test"."AssertEquals"(_Profile."Twitter"::text, 'twitter.com/marcus', 'the saved Twitter handle did not come back');
    PERFORM "test"."AssertFalse"(_Profile."WantsAwardEmails", 'award emails stayed on after being turned off');
    PERFORM "test"."AssertTrue"(_Profile."WantsDigestEmails", 'the weekly digest stayed off after being turned on');
END;
$$ LANGUAGE plpgsql;

-- The date comes back as the day it was given, in the format it was given in.
-- A date crossing into a driver as a timestamp is the day before in half the
-- world, which is what returning it as text avoids.
CREATE FUNCTION "test"."TestGetUserProfile_ReturnsTheBirthDateAsADay" () RETURNS void AS $$
DECLARE
    _Profile record;
BEGIN
    PERFORM "dbo"."SetUserProfile"(
        'member', '', '', '', '', '', 'Not specified', '1990-04-17',
        '', '', '', '', '', '', '', true, false
    );

    SELECT * INTO _Profile FROM "dbo"."GetUserProfile"('member');

    PERFORM "test"."AssertEquals"(_Profile."BirthDate"::text, '1990-04-17', 'the birth date did not come back as the day it was given');
END;
$$ LANGUAGE plpgsql;

-- A profile belongs to one account, so reading one must not spill another's.
CREATE FUNCTION "test"."TestGetUserProfile_KeepsOneAccountsProfileToItself" () RETURNS void AS $$
DECLARE
    _Other record;
BEGIN
    PERFORM "dbo"."SetUserProfile"(
        'member', 'Marcus', 'Member', '', 'Program manager', '',
        'Male', '1990-04-17', '', '', '', '', '', '', '', true, false
    );

    SELECT * INTO _Other FROM "dbo"."GetUserProfile"('owner');

    PERFORM "test"."AssertEquals"(_Other."UserUUID", "test"."Fixture"('User.Owner'), 'GetUserProfile answered for the wrong user');
    PERFORM "test"."AssertEquals"(_Other."FirstName"::text, '', 'one account''s profile was visible on another');
    PERFORM "test"."AssertTrue"(_Other."BirthDate" IS NULL, 'one account''s birth date was visible on another');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetUserProfile_ReturnsNothingForAnUnknownLogin" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."GetUserProfile"('nobody');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'GetUserProfile returned a row for a login that does not exist');
END;
$$ LANGUAGE plpgsql;
