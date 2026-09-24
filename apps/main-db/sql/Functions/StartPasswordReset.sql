--
-- Write the token for a password reset link, and retire whatever came before
-- it.
--
-- The account is named by its Keycloak "sub" rather than by a login name,
-- because who the reset is for was worked out in the identity provider: the
-- form asks for a username or an email address, main-api asks Keycloak which
-- account that is, and this is handed the answer. A login name here would be
-- a second place that decides who a reset belongs to, able to disagree with
-- the first, and it would refuse the account that has never signed in and so
-- has no row in dbo.Users.
--
-- The token is main-api's to make, for the reason written on dbo.AddUserEmail:
-- a guessable one is a way into somebody else's account, and this database has
-- no source of randomness worth trusting with a secret.
--
-- Every earlier link for the account stops working the moment this runs. A
-- reset mail sits in a mailbox forever, and somebody who asks for a second one
-- because the first went astray should not be leaving the first behind as a
-- working key.
--
-- What comes back is the row, so the caller can say when the link was sent
-- without reading the table again. Nothing about the account comes back: the
-- caller already knows more about it than this table does.
--
-- Rate limiting is main-api's, the same as it is for verification mail. This
-- writes "SentAt" and enforces nothing with it.
--
CREATE FUNCTION "dbo"."StartPasswordReset" (
    _SubjectId varchar(255),
    _Token varchar(64)
) RETURNS TABLE(
    "PasswordResetUUID" uuid,
    "SentAt" TIMESTAMPTZ
) AS $$
    DECLARE
        _NewUUID uuid;
    BEGIN
        IF _SubjectId IS NULL OR btrim(_SubjectId) = '' THEN
            RAISE EXCEPTION 'An account is required.';
        END IF;
        IF _Token IS NULL OR btrim(_Token) = '' THEN
            RAISE EXCEPTION 'A password reset token is required.';
        END IF;

        UPDATE "dbo"."PasswordResets" SET
            "SpentAt" = CURRENT_TIMESTAMP,
            "UpdatedBy" = 'password reset'
        WHERE "PasswordResets"."SubjectId" = btrim(_SubjectId)
            AND "PasswordResets"."SpentAt" IS NULL;

        INSERT INTO "dbo"."PasswordResets" ("SubjectId", "Token", "CreatedBy")
            VALUES (btrim(_SubjectId), btrim(_Token), 'password reset')
            RETURNING "PasswordResets"."PasswordResetUUID" INTO _NewUUID;

        RETURN QUERY
        SELECT
            "PasswordResets"."PasswordResetUUID",
            "PasswordResets"."SentAt"
        FROM "dbo"."PasswordResets"
        WHERE "PasswordResets"."PasswordResetUUID" = _NewUUID;
    END;
$$ LANGUAGE plpgsql;
