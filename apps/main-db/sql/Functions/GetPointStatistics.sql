--
-- What points get spent on, per reason, across an organization. From
-- GetPointUsageStatistics, which grouped debits by TransactionReason.
--
-- The draft filtered PointsChange < 0 and reported the sum as a positive
-- "TotalPointsUsed"; this keeps that, and adds the credit side, because the
-- same grouping answers "what earns points" for free.
--
-- Rows with no Reason group under NULL rather than being dropped.
--
CREATE FUNCTION "dbo"."GetPointStatistics" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _PointUUID uuid DEFAULT NULL
) RETURNS TABLE(
    "Reason" varchar(64),
    "Earned" decimal(19,4),
    "Spent" decimal(19,4),
    "Transactions" bigint
) AS $$
    DECLARE
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
    BEGIN
        RETURN QUERY
        SELECT
            "UserPoints"."Reason",
            COALESCE(SUM("UserPoints"."Amount") FILTER (WHERE "UserPoints"."Amount" > 0), 0)::decimal(19,4),
            COALESCE(-SUM("UserPoints"."Amount") FILTER (WHERE "UserPoints"."Amount" < 0), 0)::decimal(19,4),
            count(*)
        FROM
            "dbo"."UserPoints"
        WHERE
            _IsMemberOfOrganization = true AND
            "UserPoints"."OrganizationUUID" = _OrganizationUUID AND
            (_PointUUID IS NULL OR "UserPoints"."PointUUID" = _PointUUID)
        GROUP BY "UserPoints"."Reason"
        ORDER BY "UserPoints"."Reason" NULLS LAST;
    END;
$$ LANGUAGE plpgsql;
