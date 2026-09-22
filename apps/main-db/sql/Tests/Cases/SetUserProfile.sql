--
-- Writing a profile: the first save creates the row, every later one replaces
-- what it holds, and dbo.Users is never touched.
--

CREATE FUNCTION "test"."TestSetUserProfile_CreatesTheRowOnTheFirstSave" () RETURNS void AS $$
DECLARE
    _Count bigint;
    _Saved record;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."UserProfiles" WHERE "UserProfiles"."UserUUID" = "test"."Fixture"('User.Member');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'the fixtures already carry a profile for this account');

    SELECT * INTO _Saved FROM "dbo"."SetUserProfile"(
        'member', 'Marcus', 'Member', '', 'Programme manager', 'Runs the scoreboard.',
        'en-US', 'Female', '1990-04-17', '', '', '', '', '', '', true, false
    );

    PERFORM "test"."AssertEquals"(_Saved."Designation"::text, 'Programme manager', 'the save did not return what it wrote');

    SELECT count(*) INTO _Count FROM "dbo"."UserProfiles" WHERE "UserProfiles"."UserUUID" = "test"."Fixture"('User.Member');
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'the first save did not create exactly one row');
END;
$$ LANGUAGE plpgsql;

-- The upsert this function is built on: a second save is an edit, not a
-- second profile.
CREATE FUNCTION "test"."TestSetUserProfile_ReplacesTheProfileOnALaterSave" () RETURNS void AS $$
DECLARE
    _Count bigint;
    _Saved record;
BEGIN
    PERFORM "dbo"."SetUserProfile"(
        'member', 'Marcus', 'Member', 'Marc', 'Programme manager', 'First.',
        'en-US', 'Female', '1990-04-17', '', '', '', '', '', '', true, false
    );
    SELECT * INTO _Saved FROM "dbo"."SetUserProfile"(
        'member', 'Marcus', 'Member', '', 'Head of programmes', 'Second.',
        'en-GB', 'Male', '', '', '', '', '', '', '', true, false
    );

    SELECT count(*) INTO _Count FROM "dbo"."UserProfiles" WHERE "UserProfiles"."UserUUID" = "test"."Fixture"('User.Member');
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'the second save created a second profile');
    PERFORM "test"."AssertEquals"(_Saved."Designation"::text, 'Head of programmes', 'the second save did not replace the designation');
    PERFORM "test"."AssertEquals"(_Saved."Biography"::text, 'Second.', 'the second save did not replace the biography');
    PERFORM "test"."AssertEquals"(_Saved."NickName"::text, '', 'a field cleared by the second save kept its old value');
    PERFORM "test"."AssertEquals"(_Saved."Gender"::text, 'Male', 'the second save did not replace the gender');
    PERFORM "test"."AssertTrue"(_Saved."BirthDate" IS NULL, 'a birth date cleared by the second save was kept');
END;
$$ LANGUAGE plpgsql;

-- NULL is how a caller says "empty", and an empty column is NOT NULL, so the
-- two have to arrive at the same stored value.
CREATE FUNCTION "test"."TestSetUserProfile_StoresNullAndBlankAsEmpty" () RETURNS void AS $$
DECLARE
    _Saved record;
BEGIN
    SELECT * INTO _Saved FROM "dbo"."SetUserProfile"(
        'member', NULL, NULL, NULL, NULL, NULL, 'en-US', NULL,
        NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    );

    PERFORM "test"."AssertEquals"(_Saved."FirstName"::text, '', 'a NULL first name was not stored as empty');
    PERFORM "test"."AssertEquals"(_Saved."Gender"::text, 'Not specified', 'a NULL gender did not fall back to unspecified');
    PERFORM "test"."AssertTrue"(_Saved."BirthDate" IS NULL, 'a NULL birth date was stored as something');
    PERFORM "test"."AssertTrue"(_Saved."WantsAwardEmails", 'a NULL award-email preference did not fall back to the default');
    PERFORM "test"."AssertFalse"(_Saved."WantsDigestEmails", 'a NULL digest preference did not fall back to the default');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSetUserProfile_TrimsWhatItIsGiven" () RETURNS void AS $$
DECLARE
    _Saved record;
BEGIN
    SELECT * INTO _Saved FROM "dbo"."SetUserProfile"(
        'member', '  Marcus  ', '  Member ', '', '  Programme manager  ', '  Runs it.  ',
        ' en-US ', '  Male  ', '  1990-04-17  ', '', '', '', '', '', '', true, false
    );

    PERFORM "test"."AssertEquals"(_Saved."FirstName"::text, 'Marcus', 'the first name was stored with its whitespace');
    PERFORM "test"."AssertEquals"(_Saved."Designation"::text, 'Programme manager', 'the designation was stored with its whitespace');
    PERFORM "test"."AssertEquals"(_Saved."Biography"::text, 'Runs it.', 'the biography was stored with its whitespace');
    PERFORM "test"."AssertEquals"(_Saved."Language"::text, 'en-US', 'the language was stored with its whitespace');
    PERFORM "test"."AssertEquals"(_Saved."Gender"::text, 'Male', 'the gender was stored with its whitespace');
    PERFORM "test"."AssertEquals"(_Saved."BirthDate"::text, '1990-04-17', 'the birth date was not read through its whitespace');
END;
$$ LANGUAGE plpgsql;

-- Four answers and no others. The column's check constraint is what refuses
-- the rest, so a caller inventing a fifth is stopped by the database rather
-- than by whichever application happened to be asked.
CREATE FUNCTION "test"."TestSetUserProfile_RefusesAGenderItDoesNotOffer" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."SetUserProfile"(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, true, false)',
            'member', '', '', '', '', '', 'en-US', 'Wizard', '',
            '', '', '', '', '', ''
        ),
        'a gender outside the four offered was stored',
        'UserProfiles_Gender_Check'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSetUserProfile_StoresEachGenderItOffers" () RETURNS void AS $$
DECLARE
    _Gender text;
    _Saved record;
BEGIN
    FOREACH _Gender IN ARRAY ARRAY['Male', 'Female', 'Transgender', 'Not specified'] LOOP
        SELECT * INTO _Saved FROM "dbo"."SetUserProfile"(
            'member', '', '', '', '', '', 'en-US', _Gender::varchar(20), '',
            '', '', '', '', '', '', true, false
        );
        PERFORM "test"."AssertEquals"(_Saved."Gender"::text, _Gender, 'a gender the form offers did not round-trip');
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- The 31st of February parses as a string and is not a day. The message says
-- so in a sentence, rather than handing the caller the driver's complaint
-- about input syntax.
CREATE FUNCTION "test"."TestSetUserProfile_RefusesABirthDateThatIsNotADate" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."SetUserProfile"(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, true, false)',
            'member', '', '', '', '', '', 'en-US', 'Not specified', '2026-02-31',
            '', '', '', '', '', ''
        ),
        'the 31st of February was stored as a birth date',
        'A birth date must be a real date'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSetUserProfile_RefusesABirthDateInTheFuture" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."SetUserProfile"(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, true, false)',
            'member', '', '', '', '', '', 'en-US', 'Not specified',
            to_char(CURRENT_DATE + 1, 'YYYY-MM-DD'),
            '', '', '', '', '', ''
        ),
        'a birth date in the future was stored',
        'A birth date cannot be in the future.'
    );
END;
$$ LANGUAGE plpgsql;

-- Today is a date somebody was born on, and the guard is "in the future"
-- rather than "not before now".
CREATE FUNCTION "test"."TestSetUserProfile_AcceptsTodayAsABirthDate" () RETURNS void AS $$
DECLARE
    _Saved record;
BEGIN
    SELECT * INTO _Saved FROM "dbo"."SetUserProfile"(
        'member', '', '', '', '', '', 'en-US', 'Not specified',
        to_char(CURRENT_DATE, 'YYYY-MM-DD')::varchar(10),
        '', '', '', '', '', '', true, false
    );

    PERFORM "test"."AssertEquals"(_Saved."BirthDate"::text, to_char(CURRENT_DATE, 'YYYY-MM-DD'), 'a birth date of today was refused or altered');
END;
$$ LANGUAGE plpgsql;

-- dbo.ProvisionUser refreshes "Name" and "Email" from the token on every
-- sign-in, so anything this function wrote there would be undone silently.
-- It writes neither, and this is the test that says so.
CREATE FUNCTION "test"."TestSetUserProfile_LeavesTheAccountAlone" () RETURNS void AS $$
DECLARE
    _User record;
BEGIN
    PERFORM "dbo"."SetUserProfile"(
        'member', 'Somebody', 'Else', 'Nick', 'Programme manager', '', 'en-US',
        'Male', '1990-04-17', '', '', '', '', '', '', true, false
    );

    SELECT * INTO _User FROM "dbo"."Users" WHERE "Users"."LoginName" = 'member';

    PERFORM "test"."AssertEquals"(_User."Name"::text, 'Marcus Member', 'saving a profile rewrote the account name Keycloak owns');
    PERFORM "test"."AssertEquals"(_User."Email"::text, 'member@example.test', 'saving a profile rewrote the account email Keycloak owns');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSetUserProfile_RecordsWhoSavedIt" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    PERFORM "dbo"."SetUserProfile"(
        'member', 'Marcus', 'Member', '', '', '', 'en-US', 'Not specified', '',
        '', '', '', '', '', '', true, false
    );

    SELECT * INTO _Row FROM "dbo"."UserProfiles" WHERE "UserProfiles"."UserUUID" = "test"."Fixture"('User.Member');

    PERFORM "test"."AssertEquals"(_Row."CreatedBy"::text, 'member', 'the profile did not record who created it');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSetUserProfile_RefusesAnUnknownLogin" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."SetUserProfile"(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, true, false)',
            'nobody', '', '', '', '', '', 'en-US', 'Not specified', '',
            '', '', '', '', '', ''
        ),
        'a profile was saved for a login that does not exist',
        'Action cannot be performed.'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSetUserProfile_RefusesAMissingLanguage" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'SELECT * FROM "dbo"."SetUserProfile"(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, true, false)',
            'member', '', '', '', '', '', '  ', 'Not specified', '',
            '', '', '', '', '', ''
        ),
        'a profile was saved with no language',
        'A language is required.'
    );
END;
$$ LANGUAGE plpgsql;
