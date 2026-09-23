--
-- Spend a verification token: mark the address it belongs to as verified.
--
-- The token is the whole of the authorization. There is no login name here
-- and there must not be one: the link in a verification mail is followed by
-- whoever opens that mailbox, which is exactly the thing being proved, and
-- requiring a signed-in session would refuse the case where somebody adds an
-- address at work and reads it at home.
--
-- That is why the token has to be unguessable and why it is not made here.
-- See dbo.AddUserEmail.
--
-- The token is cleared as it is spent, so a link works once. A link that is
-- followed twice, or that was never valid, gets the same sentence: there is
-- nothing to gain by telling somebody holding a wrong token whether it was
-- wrong or merely used.
--
-- A link also expires. Twenty-four hours from when the mail went out is long
-- enough to find it in a spam folder tomorrow morning and short enough that a
-- forwarded mailbox archive is not a standing key to an account. An expired
-- token is left in place rather than cleared: the row still needs one to be
-- resent, and dbo.AddUserEmail's replacement writes over it.
--
-- The account is returned rather than the list, because the caller here has no
-- session to show a list to: it has a token, and what it needs back is who
-- that token belonged to so it can say whose address was confirmed.
--
CREATE FUNCTION "dbo"."VerifyUserEmail" (_VerificationToken varchar(64)) RETURNS TABLE(
    "UserEmailUUID" uuid,
    "LoginName" varchar(64),
    "Email" varchar(255),
    "IsPrimary" boolean
) AS $$
    DECLARE
        _Row record;
    BEGIN
        IF _VerificationToken IS NULL OR btrim(_VerificationToken) = '' THEN
            RAISE EXCEPTION 'That verification link is not valid or has already been used.';
        END IF;

        SELECT
            "UserEmails"."UserEmailUUID",
            "UserEmails"."UserUUID",
            "UserEmails"."Email",
            "UserEmails"."IsPrimary",
            "UserEmails"."VerificationSentAt"
        INTO _Row
        FROM "dbo"."UserEmails"
        WHERE "UserEmails"."VerificationToken" = btrim(_VerificationToken);

        IF NOT FOUND THEN
            RAISE EXCEPTION 'That verification link is not valid or has already been used.';
        END IF;
        IF _Row."VerificationSentAt" IS NULL
            OR _Row."VerificationSentAt" + interval '24 hours' <= CURRENT_TIMESTAMP THEN
            RAISE EXCEPTION 'That verification link has expired. Send yourself another one.';
        END IF;

        UPDATE "dbo"."UserEmails" SET
            "VerifiedAt" = CURRENT_TIMESTAMP,
            "VerificationToken" = NULL,
            "UpdatedBy" = 'verification'
        WHERE "UserEmails"."UserEmailUUID" = _Row."UserEmailUUID";

        RETURN QUERY
        SELECT
            "UserEmails"."UserEmailUUID",
            "Users"."LoginName",
            "UserEmails"."Email",
            "UserEmails"."IsPrimary"
        FROM "dbo"."UserEmails"
            JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserEmails"."UserUUID")
        WHERE "UserEmails"."UserEmailUUID" = _Row."UserEmailUUID";
    END;
$$ LANGUAGE plpgsql;
