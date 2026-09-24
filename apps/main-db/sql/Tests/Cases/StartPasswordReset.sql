--
-- Asking for a password reset link. Two things carry the weight here: the row
-- is written against a Keycloak "sub" and needs nothing else to exist, and
-- asking again retires every link that came before.
--

CREATE FUNCTION "test"."TestStartPasswordReset_WritesALinkThatCanBeSpent" () RETURNS void AS $$
DECLARE
    _Started record;
    _Spent record;
BEGIN
    SELECT * INTO _Started FROM "dbo"."StartPasswordReset"('subject-member', 'reset-new');

    PERFORM "test"."AssertTrue"(_Started."PasswordResetUUID" IS NOT NULL, 'no reset row came back');
    PERFORM "test"."AssertTrue"(_Started."SentAt" IS NOT NULL, 'a reset was written with no sent time');

    SELECT * INTO _Spent FROM "dbo"."SpendPasswordReset"('reset-new');

    PERFORM "test"."AssertEquals"(_Spent."SubjectId"::text, 'subject-member', 'the new link belonged to the wrong account');
END;
$$ LANGUAGE plpgsql;

-- The account is named the way Keycloak names it, and nothing here joins to
-- dbo.Users. That is what lets somebody who registered and never managed to
-- login ask for a reset at all: dbo.ProvisionUser writes our row on the first
-- request of a first session, and they have never made one.
CREATE FUNCTION "test"."TestStartPasswordReset_NeedsNoRowInUsers" () RETURNS void AS $$
DECLARE
    _Spent record;
BEGIN
    PERFORM "dbo"."StartPasswordReset"('subject-nobody-here-has-signed-in', 'reset-stranger');

    SELECT * INTO _Spent FROM "dbo"."SpendPasswordReset"('reset-stranger');

    PERFORM "test"."AssertEquals"(
        _Spent."SubjectId"::text,
        'subject-nobody-here-has-signed-in',
        'a reset for an account with no row of its own did not come back'
    );
END;
$$ LANGUAGE plpgsql;

-- A reset mail sits in a mailbox forever. Asking for a second link has to
-- finish the first, or the first is a standing key to the account.
CREATE FUNCTION "test"."TestStartPasswordReset_RetiresTheLinksBeforeIt" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."StartPasswordReset"('subject-member', 'reset-second');

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."SpendPasswordReset"(%L)', 'reset-fresh'),
        'the older link still worked after a second was asked for',
        'not valid or has already been used'
    );

    PERFORM "test"."AssertTrue"(
        (SELECT "SpentAt" IS NOT NULL FROM "dbo"."PasswordResets"
            WHERE "PasswordResetUUID" = "test"."Fixture"('PasswordReset.Fresh')),
        'the older link was left unspent'
    );
END;
$$ LANGUAGE plpgsql;

-- Only that account's links. Retiring somebody else's would let anybody who
-- can ask for a reset cancel everybody else's.
CREATE FUNCTION "test"."TestStartPasswordReset_LeavesAnotherAccountsLinkAlone" () RETURNS void AS $$
DECLARE
    _Spent record;
BEGIN
    PERFORM "dbo"."StartPasswordReset"('subject-owner', 'reset-for-the-owner');

    SELECT * INTO _Spent FROM "dbo"."SpendPasswordReset"('reset-fresh');

    PERFORM "test"."AssertEquals"(
        _Spent."SubjectId"::text,
        'subject-member',
        'a reset for one account retired another account''s link'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestStartPasswordReset_RefusesAnEmptyAccountOrToken" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."StartPasswordReset"(NULL, %L)', 'reset-orphan'),
        'a reset was written for no account',
        'An account is required'
    );

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."StartPasswordReset"(%L, %L)', '   ', 'reset-orphan'),
        'a reset was written for a blank account',
        'An account is required'
    );

    -- A blank token is a token that matches whatever a caller forgot to fill
    -- in, which is the one thing dbo.SpendPasswordReset must never be handed.
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."StartPasswordReset"(%L, NULL)', 'subject-member'),
        'a reset was written with no token',
        'A password reset token is required'
    );

    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."StartPasswordReset"(%L, %L)', 'subject-member', ''),
        'a reset was written with an empty token',
        'A password reset token is required'
    );
END;
$$ LANGUAGE plpgsql;

-- One token, one account. The unique key is what dbo.SpendPasswordReset leans
-- on to find a row from nothing but the secret it was given.
CREATE FUNCTION "test"."TestStartPasswordReset_RefusesATokenAlreadyIssued" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."StartPasswordReset"(%L, %L)', 'subject-admin', 'reset-fresh'),
        'the same token was issued twice',
        'PasswordResets_Token_UniqueKey'
    );
END;
$$ LANGUAGE plpgsql;
