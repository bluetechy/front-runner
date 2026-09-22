--
-- Write one person's profile, creating the row on the first save.
--
-- Everything is written at once rather than field by field: the profile page
-- submits a whole form, and a partial update would need a way to say "leave
-- this one alone" that NULL cannot carry, because NULL here means "cleared".
-- So a caller sends the whole profile back, and NULL and '' both mean empty.
--
-- What it will not touch is dbo.Users. "Name", "LoginName" and "Email" are
-- Keycloak's, refreshed from the token by dbo.ProvisionUser on every sign-in;
-- writing them here would last until the owner next signed in and no longer.
-- A caller that wants those changed has to change them at Keycloak.
--
-- Shape only is checked here -- that what has to be there is there, and that
-- nothing is longer than its column. What an address or a handle means is the
-- API's business; see main-api's profile schema.
--
CREATE FUNCTION "dbo"."SetUserProfile" (
    _LoginName varchar(64),
    _FirstName varchar(64),
    _LastName varchar(64),
    _NickName varchar(64),
    _Designation varchar(64),
    _Biography varchar(2000),
    _Gender varchar(20),
    _BirthDate varchar(10),
    _Phone varchar(32),
    _Address varchar(255),
    _Facebook varchar(255),
    _Github varchar(255),
    _LinkedIn varchar(255),
    _TikTok varchar(255),
    _Twitter varchar(255),
    _WantsAwardEmails boolean,
    _WantsDigestEmails boolean
) RETURNS TABLE(
    "UserUUID" uuid,
    "FirstName" varchar(64),
    "LastName" varchar(64),
    "NickName" varchar(64),
    "Designation" varchar(64),
    "Biography" varchar(2000),
    "Gender" varchar(20),
    "BirthDate" varchar(10),
    "Phone" varchar(32),
    "Address" varchar(255),
    "Facebook" varchar(255),
    "Github" varchar(255),
    "LinkedIn" varchar(255),
    "TikTok" varchar(255),
    "Twitter" varchar(255),
    "WantsAwardEmails" boolean,
    "WantsDigestEmails" boolean
) AS $$
    DECLARE
        _UserUUID uuid;
        _Birth date;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;
        -- NULL is how a caller says "nothing here", and for a question with
        -- four answers that is the fourth one rather than an error. Anything
        -- else the check constraint refuses.
        _Gender := COALESCE(NULLIF(btrim(_Gender), ''), 'Not specified');

        -- Empty means "not given". Anything else has to be a real date that
        -- has already happened: the cast is what catches the 31st of
        -- February, and it is caught here so the caller is told in a sentence
        -- rather than handed a driver's error about input syntax.
        IF NULLIF(btrim(COALESCE(_BirthDate, '')), '') IS NULL THEN
            _Birth := NULL;
        ELSE
            BEGIN
                _Birth := btrim(_BirthDate)::date;
            EXCEPTION WHEN OTHERS THEN
                RAISE EXCEPTION 'A birth date must be a real date, written YYYY-MM-DD.';
            END;
            IF _Birth > CURRENT_DATE THEN
                RAISE EXCEPTION 'A birth date cannot be in the future.';
            END IF;
        END IF;

        -- The unique key is named rather than inferred, because the output
        -- columns above shadow the table's and a bare column list in
        -- ON CONFLICT is ambiguous. See apps/main-db/CLAUDE.md.
        INSERT INTO "dbo"."UserProfiles" (
            "UserUUID", "FirstName", "LastName", "NickName", "Designation",
            "Biography", "Gender", "BirthDate", "Phone", "Address",
            "Facebook", "Github", "LinkedIn", "TikTok", "Twitter",
            "WantsAwardEmails", "WantsDigestEmails", "CreatedBy"
        )
        VALUES (
            _UserUUID,
            btrim(COALESCE(_FirstName, '')),
            btrim(COALESCE(_LastName, '')),
            btrim(COALESCE(_NickName, '')),
            btrim(COALESCE(_Designation, '')),
            btrim(COALESCE(_Biography, '')),
            _Gender,
            _Birth,
            btrim(COALESCE(_Phone, '')),
            btrim(COALESCE(_Address, '')),
            btrim(COALESCE(_Facebook, '')),
            btrim(COALESCE(_Github, '')),
            btrim(COALESCE(_LinkedIn, '')),
            btrim(COALESCE(_TikTok, '')),
            btrim(COALESCE(_Twitter, '')),
            COALESCE(_WantsAwardEmails, true),
            COALESCE(_WantsDigestEmails, false),
            _LoginName
        )
        ON CONFLICT ON CONSTRAINT "UserProfiles_UserUUID_UniqueKey" DO UPDATE SET
            "FirstName" = EXCLUDED."FirstName",
            "LastName" = EXCLUDED."LastName",
            "NickName" = EXCLUDED."NickName",
            "Designation" = EXCLUDED."Designation",
            "Biography" = EXCLUDED."Biography",
            "Gender" = EXCLUDED."Gender",
            "BirthDate" = EXCLUDED."BirthDate",
            "Phone" = EXCLUDED."Phone",
            "Address" = EXCLUDED."Address",
            "Facebook" = EXCLUDED."Facebook",
            "Github" = EXCLUDED."Github",
            "LinkedIn" = EXCLUDED."LinkedIn",
            "TikTok" = EXCLUDED."TikTok",
            "Twitter" = EXCLUDED."Twitter",
            "WantsAwardEmails" = EXCLUDED."WantsAwardEmails",
            "WantsDigestEmails" = EXCLUDED."WantsDigestEmails",
            "UpdatedBy" = _LoginName;

        RETURN QUERY SELECT * FROM "dbo"."GetUserProfile"(_LoginName);
    END;
$$ LANGUAGE plpgsql;
