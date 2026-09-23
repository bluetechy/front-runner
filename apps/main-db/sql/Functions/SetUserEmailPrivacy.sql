--
-- Turn the "keep my email addresses private" switch on the security page.
--
-- One column, so one function rather than routing it through
-- dbo.SetUserProfile: that one takes the profile form's seventeen fields and
-- writes all of them, and a switch that submitted a whole profile to move one
-- boolean would overwrite whatever the profile page had open at the time.
--
-- It upserts the same row dbo.SetUserProfile upserts, on the same named
-- constraint, because an account that has never opened the profile page has no
-- dbo.UserProfiles row yet and a switch should not be the thing that refuses.
-- Every other column on that table has a default, which is what makes an
-- insert naming only this one legal.
--
-- What the setting does is dbo.GetOrganizationMembers' and
-- dbo.SetOrganizationRole's business: both return an empty "Email" for an
-- account that has set it. It is read there rather than enforced here, so
-- turning it off gives the address back rather than having lost it.
--
CREATE FUNCTION "dbo"."SetUserEmailPrivacy" (
    _LoginName varchar(64),
    _EmailIsPrivate boolean
) RETURNS TABLE(
    "UserUUID" uuid,
    "EmailIsPrivate" boolean
) AS $$
    DECLARE
        _UserUUID uuid;
    BEGIN
        _UserUUID := "dbo"."GetUserUUID"(_LoginName);
        IF _UserUUID IS NULL THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        -- The constraint is named rather than inferred: the output columns
        -- above shadow the table's, so a bare column list in ON CONFLICT is
        -- ambiguous. See apps/main-db/CLAUDE.md.
        INSERT INTO "dbo"."UserProfiles" ("UserUUID", "EmailIsPrivate", "CreatedBy")
        VALUES (_UserUUID, COALESCE(_EmailIsPrivate, false), _LoginName)
        ON CONFLICT ON CONSTRAINT "UserProfiles_UserUUID_UniqueKey" DO UPDATE SET
            "EmailIsPrivate" = EXCLUDED."EmailIsPrivate",
            "UpdatedBy" = _LoginName;

        RETURN QUERY
        SELECT "UserProfiles"."UserUUID", "UserProfiles"."EmailIsPrivate"
        FROM "dbo"."UserProfiles"
        WHERE "UserProfiles"."UserUUID" = _UserUUID;
    END;
$$ LANGUAGE plpgsql;
