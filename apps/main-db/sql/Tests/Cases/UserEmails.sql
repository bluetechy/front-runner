--
-- What the table's own columns mean, and the constraints that hold the two
-- invariants no function can be trusted to hold alone: one address belongs to
-- one account, and an address is stored folded.
--

-- The unique key is over "Email" alone rather than over (user, address): an
-- address identifies a person to everything that mails it.
CREATE FUNCTION "test"."TestUserEmails_RejectAnAddressHeldByAnotherAccount" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."UserEmails" ("UserUUID", "Email", "CreatedBy") VALUES (%L, %L, ''test'')',
            "test"."Fixture"('User.Owner'), 'member@example.test'
        ),
        'two accounts held the same address'
    );
END;
$$ LANGUAGE plpgsql;

-- The fold is enforced rather than hoped for. Postgres compares varchar by
-- bytes, so without this check "Member@example.test" would be a second row and
-- the unique key above would not mean what it looks like it means.
CREATE FUNCTION "test"."TestUserEmails_RejectAnAddressThatIsNotFolded" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."UserEmails" ("UserUUID", "Email", "CreatedBy") VALUES (%L, %L, ''test'')',
            "test"."Fixture"('User.Owner'), 'Olivia@Example.test'
        ),
        'an address with capitals was stored as it was typed'
    );

    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."UserEmails" ("UserUUID", "Email", "CreatedBy") VALUES (%L, %L, ''test'')',
            "test"."Fixture"('User.Owner'), '  olivia@example.test  '
        ),
        'an address with surrounding space was stored untrimmed'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestUserEmails_RejectSomethingThatIsNotAnAddress" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."UserEmails" ("UserUUID", "Email", "CreatedBy") VALUES (%L, %L, ''test'')',
            "test"."Fixture"('User.Owner'), 'olivia'
        ),
        'a string with no @ was stored as an address'
    );

    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."UserEmails" ("UserUUID", "Email", "CreatedBy") VALUES (%L, %L, ''test'')',
            "test"."Fixture"('User.Owner'), '@example.test'
        ),
        'a string with nothing before the @ was stored as an address'
    );
END;
$$ LANGUAGE plpgsql;

-- Two rows can hold a NULL token, because every verified row does. This is the
-- Postgres behavior the unique key depends on, asserted rather than assumed.
CREATE FUNCTION "test"."TestUserEmails_AllowManyRowsWithNoToken" () RETURNS void AS $$
BEGIN
    INSERT INTO "dbo"."UserEmails" ("UserUUID", "Email", "VerifiedAt", "CreatedBy")
    VALUES ("test"."Fixture"('User.Owner'), 'olivia.one@example.test', CURRENT_TIMESTAMP, 'test');

    INSERT INTO "dbo"."UserEmails" ("UserUUID", "Email", "VerifiedAt", "CreatedBy")
    VALUES ("test"."Fixture"('User.Owner'), 'olivia.two@example.test', CURRENT_TIMESTAMP, 'test');

    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''owner'')',
        3,
        'two verified addresses with no token could not coexist'
    );
END;
$$ LANGUAGE plpgsql;

-- A token, on the other hand, has to be unique: dbo.VerifyUserEmail is given
-- nothing but the token and has to find one row from it.
CREATE FUNCTION "test"."TestUserEmails_RejectADuplicateToken" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."UserEmails" ("UserUUID", "Email", "VerificationToken", "CreatedBy") VALUES (%L, %L, %L, ''test'')',
            "test"."Fixture"('User.Owner'), 'olivia.one@example.test', 'token-fresh'
        ),
        'two addresses shared one verification token'
    );
END;
$$ LANGUAGE plpgsql;

-- "VerifiedAt" is the whole of the verified status. A row with no timestamp is
-- unverified, and there is no second column that could disagree with it.
CREATE FUNCTION "test"."TestUserEmails_ReadAMissingTimestampAsUnverified" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."GetUserEmails"(''member'') WHERE NOT "IsVerified"',
        2,
        'the member''s two unverified addresses did not read as unverified'
    );
END;
$$ LANGUAGE plpgsql;

-- An address is not a membership: deleting one leaves the account alone.
CREATE FUNCTION "test"."TestUserEmails_AreOwnedByAnAccountThatSurvivesThem" () RETURNS void AS $$
BEGIN
    DELETE FROM "dbo"."UserEmails"
    WHERE "UserEmails"."UserEmailUUID" = "test"."Fixture"('UserEmail.MemberWork');

    PERFORM "test"."AssertRowCount"(
        'SELECT * FROM "dbo"."Users" WHERE "LoginName" = ''member''',
        1,
        'removing an address removed the account'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestUserEmails_RejectAnUnknownAccount" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        'INSERT INTO "dbo"."UserEmails" ("UserUUID", "Email", "CreatedBy") VALUES (''00000000-0000-4000-8000-000000000000'', ''nobody@example.test'', ''test'')',
        'an address was stored against an account that does not exist'
    );
END;
$$ LANGUAGE plpgsql;
