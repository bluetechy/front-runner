--
-- Record that somebody tried to log into an account and could not.
--
-- The account is named by its subject id rather than by a login name, and that
-- is the whole reason this function exists. A failed login is the one security
-- event this application never sees: Keycloak refuses the password and no token
-- is ever minted, so it is read back out of the provider's own event log
-- afterwards -- see apps/main-api/src/security-events/login-failures.service.ts.
-- What the provider hands back names the account by its subject, which is
-- "dbo"."Users"."SubjectId", and the string somebody actually typed at the
-- prompt is not usable here: Keycloak accepts an email address as well as a
-- username, so it is frequently not a login name at all.
--
-- A subject this installation has never provisioned writes nothing and answers
-- NULL. That is not a failure either. It is somebody guessing at a name that
-- does not exist here, and there is no account for the row to belong to; there
-- is also nobody to tell, which is the point -- a security log that grew a row
-- for a username nobody holds would answer "does this account exist" to whoever
-- was guessing.
--
-- Through "dbo"."LogSecurityEvent" rather than around it, so the one writer
-- stays the one writer. All this adds is the lookup key.
--
-- No device and no place. The provider's event log records the address the
-- attempt came from and nothing about the browser, and the address is the thing
-- this product has decided not to turn into a location -- see
-- "dbo"."SecurityEvents".
--
CREATE FUNCTION "dbo"."LogLoginFailure" (
    _SubjectId varchar(255),
    _Description text,
    _OccurredAt TIMESTAMPTZ DEFAULT NULL
) RETURNS uuid AS $$
    DECLARE
        _LoginName varchar(64);
    BEGIN
        IF _SubjectId IS NULL OR _SubjectId = '' THEN
            RETURN NULL;
        END IF;

        SELECT "Users"."LoginName" INTO _LoginName
        FROM "dbo"."Users"
        WHERE "Users"."SubjectId" = _SubjectId;

        IF _LoginName IS NULL THEN
            RETURN NULL;
        END IF;

        RETURN "dbo"."LogSecurityEvent"(
            _LoginName, 'LoginFailed', _Description, NULL, NULL, _OccurredAt
        );
    END;
$$ LANGUAGE plpgsql;
