--
-- The point ledger for one user, with optional filters.
--
-- This replaces seven drafts that read PointUsageLogs with the same projection
-- and differed only in their WHERE clause: GetUserPointTransactions (none),
-- GetPointActivityHistory (a row limit), GetPointEarningsHistory (credits
-- only), GetPointTransactionsByType (one reason), AuditPointTransactions,
-- CheckExpiringPoints (expiring soon) and ExportPointHistoryToCsv. The CSV one
-- did not come across at all -- formatting is not the database's job.
--
-- Every filter is optional. NULL means "do not filter on this".
--   _Reason         one transaction reason
--   _Sign           1 for credits only, -1 for debits only
--   _ExpiringBefore only rows that expire before this moment
--   _RowLimit       0 or NULL for all rows
--
CREATE FUNCTION "dbo"."GetPointHistory" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _PointUUID uuid DEFAULT NULL,
    _Reason varchar(64) DEFAULT NULL,
    _Sign integer DEFAULT NULL,
    _ExpiringBefore timestamp with time zone DEFAULT NULL,
    _RowLimit integer DEFAULT NULL
) RETURNS TABLE(
    "UserPointUUID" uuid,
    "UserUUID" uuid,
    "OrganizationUUID" uuid,
    "PointUUID" uuid,
    "PointName" varchar(64),
    "Description" text,
    "Reason" varchar(64),
    "Details" jsonb,
    "Amount" decimal(19,4),
    "ExpiresAt" timestamp with time zone,
    "CreatedAt" timestamp with time zone
) AS $$
    DECLARE
        _UserUUID uuid = "dbo"."GetUserUUID"(_LoginName);
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
    BEGIN
        RETURN QUERY
        SELECT
            "UserPoints"."UserPointUUID",
            "UserPoints"."UserUUID",
            "UserPoints"."OrganizationUUID",
            "UserPoints"."PointUUID",
            "Points"."Name",
            "UserPoints"."Description",
            "UserPoints"."Reason",
            "UserPoints"."Details",
            "UserPoints"."Amount",
            "UserPoints"."ExpiresAt",
            "UserPoints"."CreatedAt"
        FROM
            "dbo"."UserPoints"
            LEFT JOIN "dbo"."Points" ON ("Points"."PointUUID" = "UserPoints"."PointUUID")
        WHERE
            _IsMemberOfOrganization = true AND
            "UserPoints"."UserUUID" = _UserUUID AND
            "UserPoints"."OrganizationUUID" = _OrganizationUUID AND
            (_PointUUID IS NULL OR "UserPoints"."PointUUID" = _PointUUID) AND
            (_Reason IS NULL OR "UserPoints"."Reason" = _Reason) AND
            (_Sign IS NULL OR sign("UserPoints"."Amount") = _Sign) AND
            (_ExpiringBefore IS NULL OR ("UserPoints"."ExpiresAt" IS NOT NULL AND "UserPoints"."ExpiresAt" < _ExpiringBefore))
        ORDER BY "UserPoints"."CreatedAt" DESC
        LIMIT (CASE WHEN COALESCE(_RowLimit, 0) > 0 THEN _RowLimit ELSE NULL END);
    END;
$$ LANGUAGE plpgsql;
