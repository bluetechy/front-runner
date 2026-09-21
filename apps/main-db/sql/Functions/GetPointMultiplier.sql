--
-- The factor in force right now, or 1 when no multiplier is open. Never NULL,
-- so a caller can multiply by it unconditionally.
--
-- From ApplyPointMultiplier, which did something else entirely: it multiplied
-- the user's whole balance by the factor, so running a "double points" event
-- retroactively doubled everything they had ever earned. A multiplier scales
-- an award as it is made -- see dbo.AddUserPoints, which takes it as a flag.
--
-- The draft also read "SELECT MultiplierFactor INTO MultiplierFactor", which
-- assigns a variable from itself.
--
-- If two multipliers overlap the largest wins, which is the reading a user
-- would expect and the drafts never settled.
--
CREATE FUNCTION "dbo"."GetPointMultiplier" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _At timestamp with time zone DEFAULT NULL
) RETURNS decimal(19,4) AS $$
    DECLARE
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
        _Moment timestamp with time zone = COALESCE(_At, now());
        _Factor decimal(19,4);
    BEGIN
        IF _IsMemberOfOrganization IS NOT true THEN
            RETURN 1.0000;
        END IF;

        SELECT MAX("PointMultipliers"."Factor") INTO _Factor
        FROM "dbo"."PointMultipliers"
        WHERE "PointMultipliers"."IsEnabled" = true
            AND ("PointMultipliers"."StartsAt" IS NULL OR "PointMultipliers"."StartsAt" <= _Moment)
            AND ("PointMultipliers"."EndsAt" IS NULL OR "PointMultipliers"."EndsAt" >= _Moment);

        RETURN COALESCE(_Factor, 1.0000);
    END;
$$ LANGUAGE plpgsql;
