--
-- Points earned and spent per point type, optionally since a moment.
--
-- This replaces four drafts that were one query with a different date window:
-- CalculateUserDailyPoints, CalculateUserWeeklyPoints,
-- CalculateUserMonthlyPoints and GetTotalPointsEarned. Pass _Since as
-- now() - interval '1 day', '7 days', '1 month', or NULL for all time.
--
-- CalculateUserPointBalance was a fifth, and did not come across: the current
-- balance is dbo.UserTallies, which dbo.calculate_tallies maintains and
-- dbo.GetTallies reads. Summing the ledger to get a balance would be a second
-- answer to a question that already has one.
--
-- "Earned" and "Spent" split the signed amounts; "Spent" is returned positive.
-- Expired rows are included -- this is what moved, not what is still good.
--
CREATE FUNCTION "dbo"."GetPointTotals" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _Since timestamp with time zone DEFAULT NULL
) RETURNS TABLE(
    "PointUUID" uuid,
    "PointName" varchar(64),
    "Earned" decimal(19,4),
    "Spent" decimal(19,4),
    "Net" decimal(19,4),
    "Transactions" bigint
) AS $$
    DECLARE
        _UserUUID uuid = "dbo"."GetUserUUID"(_LoginName);
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
    BEGIN
        RETURN QUERY
        SELECT
            "UserPoints"."PointUUID",
            "Points"."Name",
            COALESCE(SUM("UserPoints"."Amount") FILTER (WHERE "UserPoints"."Amount" > 0), 0)::decimal(19,4),
            COALESCE(-SUM("UserPoints"."Amount") FILTER (WHERE "UserPoints"."Amount" < 0), 0)::decimal(19,4),
            COALESCE(SUM("UserPoints"."Amount"), 0)::decimal(19,4),
            count(*)
        FROM
            "dbo"."UserPoints"
            LEFT JOIN "dbo"."Points" ON ("Points"."PointUUID" = "UserPoints"."PointUUID")
        WHERE
            _IsMemberOfOrganization = true AND
            "UserPoints"."UserUUID" = _UserUUID AND
            "UserPoints"."OrganizationUUID" = _OrganizationUUID AND
            (_Since IS NULL OR "UserPoints"."CreatedAt" >= _Since)
        GROUP BY "UserPoints"."PointUUID", "Points"."Name"
        ORDER BY "Points"."Name";
    END;
$$ LANGUAGE plpgsql;
