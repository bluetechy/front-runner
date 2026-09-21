--
-- Standings for one point type in an organization, highest first.
--
-- Replaces GetPointLeaderboard and GetPointLeaderboardForGroup, which were the
-- same query with a team filter bolted on. _TeamUUID NULL ranks the whole
-- organization; a team UUID ranks that team.
--
-- The LEFT JOIN and COALESCE come from the draft and are the point of it: a
-- member with no tally row still appears, on zero, instead of vanishing.
--
CREATE FUNCTION "dbo"."GetPointLeaderboard" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _PointUUID uuid,
    _TeamUUID uuid DEFAULT NULL,
    _RowLimit integer DEFAULT NULL
) RETURNS TABLE(
    "UserUUID" uuid,
    "Name" varchar(64),
    "Amount" decimal(19,4),
    "Position" bigint
) AS $$
    DECLARE
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
    BEGIN
        RETURN QUERY
        SELECT
            "Users"."UserUUID",
            "Users"."Name",
            COALESCE("UserTallies"."Amount", 0)::decimal(19,4),
            rank() OVER (ORDER BY COALESCE("UserTallies"."Amount", 0) DESC)
        FROM
            "dbo"."UserOrganizations"
            JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID")
            LEFT JOIN "dbo"."UserTallies" ON (
                "UserTallies"."UserUUID" = "Users"."UserUUID" AND
                "UserTallies"."OrganizationUUID" = _OrganizationUUID AND
                "UserTallies"."PointUUID" = _PointUUID
            )
        WHERE
            _IsMemberOfOrganization = true AND
            "UserOrganizations"."OrganizationUUID" = _OrganizationUUID AND
            "Users"."IsEnabled" = true AND
            (_TeamUUID IS NULL OR EXISTS (
                SELECT 1 FROM "dbo"."UserTeams"
                WHERE "UserTeams"."UserUUID" = "Users"."UserUUID" AND "UserTeams"."TeamUUID" = _TeamUUID
            ))
        ORDER BY COALESCE("UserTallies"."Amount", 0) DESC, "Users"."Name"
        LIMIT (CASE WHEN COALESCE(_RowLimit, 0) > 0 THEN _RowLimit ELSE NULL END);
    END;
$$ LANGUAGE plpgsql;
