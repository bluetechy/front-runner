--
-- One person's profile, by login name.
--
-- A row comes back for any account that exists, whether or not it has ever
-- been edited: the profile is optional, the answer is not. An account with no
-- dbo.UserProfiles row reads as one with every field empty and the two mail
-- preferences at their defaults, which is exactly what a first visit to the
-- profile page should see.
--
-- "FirstName" and "LastName" come back as stored -- empty when nobody has set
-- them. Splitting the account's "Name" to fill them in is the caller's
-- business, because the caller is the one that knows how it intends to show a
-- name it had to guess at.
--
CREATE FUNCTION "dbo"."GetUserProfile" (_LoginName varchar(64)) RETURNS TABLE(
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
    "WantsDigestEmails" boolean,
    "EmailIsPrivate" boolean
) AS $$
    BEGIN
        RETURN QUERY
        SELECT
            "Users"."UserUUID",
            COALESCE("UserProfiles"."FirstName", ''::varchar(64)),
            COALESCE("UserProfiles"."LastName", ''::varchar(64)),
            COALESCE("UserProfiles"."NickName", ''::varchar(64)),
            COALESCE("UserProfiles"."Designation", ''::varchar(64)),
            COALESCE("UserProfiles"."Biography", ''::varchar(2000)),
            COALESCE("UserProfiles"."Gender", 'Not specified'::varchar(20)),
            -- As text, deliberately. A date crossing into a driver becomes a
            -- timestamp at local midnight, which is the day before in half
            -- the world; "1990-04-17" is the same day everywhere.
            CAST(to_char("UserProfiles"."BirthDate", 'YYYY-MM-DD') AS varchar(10)),
            COALESCE("UserProfiles"."Phone", ''::varchar(32)),
            COALESCE("UserProfiles"."Address", ''::varchar(255)),
            COALESCE("UserProfiles"."Facebook", ''::varchar(255)),
            COALESCE("UserProfiles"."Github", ''::varchar(255)),
            COALESCE("UserProfiles"."LinkedIn", ''::varchar(255)),
            COALESCE("UserProfiles"."TikTok", ''::varchar(255)),
            COALESCE("UserProfiles"."Twitter", ''::varchar(255)),
            COALESCE("UserProfiles"."WantsAwardEmails", true),
            COALESCE("UserProfiles"."WantsDigestEmails", false),
            -- The security page's switch, not the profile form's. It is
            -- returned here because this is the function that says what an
            -- account's profile holds, and dbo.SetUserProfile returns this
            -- shape back; dbo.SetUserEmailPrivacy is what writes it.
            --
            -- True for an account with no profile row at all, which is what
            -- the column itself defaults to: an address nobody has offered to
            -- share is withheld.
            COALESCE("UserProfiles"."EmailIsPrivate", true)
        FROM
            "dbo"."Users"
            LEFT JOIN "dbo"."UserProfiles" ON ("UserProfiles"."UserUUID" = "Users"."UserUUID")
        WHERE
            "Users"."LoginName" = _LoginName
        LIMIT 1;
    END;
$$ LANGUAGE plpgsql;
