--
-- Writing a set of recovery codes. Two things carry the weight: a new set
-- retires every code that came before it, and it retires only that account's.
--

CREATE FUNCTION "test"."TestReplaceRecoveryCodes_WritesTheWholeBatch" () RETURNS void AS $$
DECLARE
    _Batch record;
BEGIN
    SELECT * INTO _Batch FROM "dbo"."ReplaceRecoveryCodes"(
        'subject-nobody-here-has-signed-in',
        ARRAY['hash-new-one', 'hash-new-two', 'hash-new-three']::varchar(64)[]
    );

    PERFORM "test"."AssertEquals"(_Batch."CodeCount", 3, 'the batch did not hold every code it was given');
    PERFORM "test"."AssertTrue"(_Batch."BatchId" IS NOT NULL, 'a batch came back with no id');
    PERFORM "test"."AssertTrue"(_Batch."CreatedAt" IS NOT NULL, 'a batch came back with no date');

    PERFORM "test"."AssertEquals"(
        (SELECT count(*)::integer FROM "dbo"."RecoveryCodes"
            WHERE "BatchId" = _Batch."BatchId" AND "SpentAt" IS NULL),
        3,
        'the new codes were not all spendable'
    );
END;
$$ LANGUAGE plpgsql;

-- The account is named the way Keycloak names it, and nothing here joins to
-- dbo.Users. Somebody who registered, turned two-factor on and never managed
-- to login has no row of ours at all, and is exactly who needs these codes.
CREATE FUNCTION "test"."TestReplaceRecoveryCodes_NeedsNoRowInUsers" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."ReplaceRecoveryCodes"(
        'subject-nobody-here-has-signed-in',
        ARRAY['hash-stranger']::varchar(64)[]
    );

    PERFORM "test"."AssertEquals"(
        (SELECT count(*)::integer FROM "dbo"."RecoveryCodes"
            WHERE "SubjectId" = 'subject-nobody-here-has-signed-in'),
        1,
        'a batch for an account with no row of its own was not written'
    );
END;
$$ LANGUAGE plpgsql;

-- A printed sheet of codes lives in a drawer forever. Asking for new ones has
-- to stop the old ones working, or the drawer is a standing key.
CREATE FUNCTION "test"."TestReplaceRecoveryCodes_RetiresTheCodesBeforeThem" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."ReplaceRecoveryCodes"('subject-member', ARRAY['hash-member-fresh']::varchar(64)[]);

    PERFORM "test"."AssertTrue"(
        (SELECT "SpentAt" IS NOT NULL FROM "dbo"."RecoveryCodes"
            WHERE "RecoveryCodeUUID" = "test"."Fixture"('RecoveryCode.MemberFirst')),
        'an older code was left spendable after a new batch was written'
    );
    PERFORM "test"."AssertEquals"(
        (SELECT count(*)::integer FROM "dbo"."RecoveryCodes"
            WHERE "SubjectId" = 'subject-member' AND "SpentAt" IS NULL),
        1,
        'the account was left holding more than its newest batch'
    );
END;
$$ LANGUAGE plpgsql;

-- Only that account's codes. Retiring somebody else's would let anybody who
-- can ask for a new sheet cancel everybody else's.
CREATE FUNCTION "test"."TestReplaceRecoveryCodes_LeavesAnotherAccountsCodesAlone" () RETURNS void AS $$
BEGIN
    PERFORM "dbo"."ReplaceRecoveryCodes"('subject-member', ARRAY['hash-member-fresh']::varchar(64)[]);

    PERFORM "test"."AssertTrue"(
        (SELECT "SpentAt" IS NULL FROM "dbo"."RecoveryCodes"
            WHERE "RecoveryCodeUUID" = "test"."Fixture"('RecoveryCode.OwnerOnly')),
        'one account''s new batch retired another account''s code'
    );
END;
$$ LANGUAGE plpgsql;

-- Refused before anything is retired, so a call that cannot be honored leaves
-- the account holding the codes it already had rather than none at all.
CREATE FUNCTION "test"."TestReplaceRecoveryCodes_RefusesAnEmptySet" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."ReplaceRecoveryCodes"(%L, %L::varchar(64)[])', 'subject-member', '{}'),
        'an empty set of codes was accepted',
        'At least one recovery code is required'
    );

    PERFORM "test"."AssertTrue"(
        (SELECT "SpentAt" IS NULL FROM "dbo"."RecoveryCodes"
            WHERE "RecoveryCodeUUID" = "test"."Fixture"('RecoveryCode.MemberFirst')),
        'a refused call retired the codes the account already had'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestReplaceRecoveryCodes_RefusesABlankCode" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."ReplaceRecoveryCodes"(%L, ARRAY[%L, %L]::varchar(64)[])',
               'subject-member', 'hash-real', '   '),
        'a blank code was accepted',
        'A recovery code is required'
    );

    PERFORM "test"."AssertTrue"(
        (SELECT "SpentAt" IS NULL FROM "dbo"."RecoveryCodes"
            WHERE "RecoveryCodeUUID" = "test"."Fixture"('RecoveryCode.MemberFirst')),
        'a refused call retired the codes the account already had'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestReplaceRecoveryCodes_RefusesNoAccount" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT * FROM "dbo"."ReplaceRecoveryCodes"(%L, ARRAY[%L]::varchar(64)[])', '  ', 'hash-orphan'),
        'a batch with no account was accepted',
        'An account is required'
    );
END;
$$ LANGUAGE plpgsql;
