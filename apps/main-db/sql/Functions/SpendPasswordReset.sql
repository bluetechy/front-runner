--
-- Spend a password reset token: say whose account it is, and stop it working.
--
-- The token is the whole of the authorization, the same as it is for
-- dbo.VerifyUserEmail. There is no login name here and there must not be one:
-- the link is followed by whoever opens the mailbox, and being able to read
-- that mailbox is the thing being proved. Somebody who could also name the
-- account would be asked to prove nothing at all.
--
-- The answer is the Keycloak "sub", because setting the password is the
-- identity provider's to do and that is what it is asked by. This function
-- changes no password: it says who, once.
--
-- The token is marked spent as this runs, before main-api has set anything, so
-- a link works once whatever happens next. A reset that then fails at Keycloak
-- means asking for a new link, which is the safe way round: the other way, a
-- link that failed once is still live in a mailbox.
--
-- A link that was never valid, one already used and one retired by a newer
-- request all get the same sentence. There is nothing to gain by telling
-- somebody holding a wrong token which it was.
--
-- One hour from when the mail went out. A reset is acted on by somebody
-- sitting there wanting to login, so the day dbo.VerifyUserEmail allows would
-- be an hour of usefulness and twenty-three of exposure.
--
CREATE FUNCTION "dbo"."SpendPasswordReset" (_Token varchar(64)) RETURNS TABLE(
    "PasswordResetUUID" uuid,
    "SubjectId" varchar(255)
) AS $$
    DECLARE
        _Row record;
    BEGIN
        IF _Token IS NULL OR btrim(_Token) = '' THEN
            RAISE EXCEPTION 'That password reset link is not valid or has already been used.';
        END IF;

        SELECT
            "PasswordResets"."PasswordResetUUID",
            "PasswordResets"."SubjectId",
            "PasswordResets"."SentAt",
            "PasswordResets"."SpentAt"
        INTO _Row
        FROM "dbo"."PasswordResets"
        WHERE "PasswordResets"."Token" = btrim(_Token);

        IF NOT FOUND OR _Row."SpentAt" IS NOT NULL THEN
            RAISE EXCEPTION 'That password reset link is not valid or has already been used.';
        END IF;
        IF _Row."SentAt" + interval '1 hour' <= CURRENT_TIMESTAMP THEN
            RAISE EXCEPTION 'That password reset link has expired. Ask for another one.';
        END IF;

        UPDATE "dbo"."PasswordResets" SET
            "SpentAt" = CURRENT_TIMESTAMP,
            "UpdatedBy" = 'password reset'
        WHERE "PasswordResets"."PasswordResetUUID" = _Row."PasswordResetUUID";

        RETURN QUERY
        SELECT
            "PasswordResets"."PasswordResetUUID",
            "PasswordResets"."SubjectId"
        FROM "dbo"."PasswordResets"
        WHERE "PasswordResets"."PasswordResetUUID" = _Row."PasswordResetUUID";
    END;
$$ LANGUAGE plpgsql;
