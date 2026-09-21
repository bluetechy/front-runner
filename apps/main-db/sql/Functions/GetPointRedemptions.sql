--
-- A user's redemption requests. From GetPointRedemptionHistory.
--
-- These are requests and their outcomes, not movements of points: a redemption
-- marked Approved has not changed any balance. See SCHEMA-NOTES.md.
--
CREATE FUNCTION "dbo"."GetPointRedemptions" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _Status varchar(20) DEFAULT NULL,
    _RowLimit integer DEFAULT NULL
) RETURNS TABLE(
    "PointRedemptionUUID" uuid,
    "UserUUID" uuid,
    "PointUUID" uuid,
    "PointName" varchar(64),
    "Amount" decimal(19,4),
    "Description" text,
    "Status" varchar(20),
    "RedeemedAt" timestamp with time zone,
    "CreatedAt" timestamp with time zone
) AS $$
    DECLARE
        _UserUUID uuid = "dbo"."GetUserUUID"(_LoginName);
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
    BEGIN
        RETURN QUERY
        SELECT
            "PointRedemptions"."PointRedemptionUUID",
            "PointRedemptions"."UserUUID",
            "PointRedemptions"."PointUUID",
            "Points"."Name",
            "PointRedemptions"."Amount",
            "PointRedemptions"."Description",
            "PointRedemptions"."Status",
            "PointRedemptions"."RedeemedAt",
            "PointRedemptions"."CreatedAt"
        FROM
            "dbo"."PointRedemptions"
            LEFT JOIN "dbo"."Points" ON ("Points"."PointUUID" = "PointRedemptions"."PointUUID")
        WHERE
            _IsMemberOfOrganization = true AND
            "PointRedemptions"."UserUUID" = _UserUUID AND
            "PointRedemptions"."OrganizationUUID" = _OrganizationUUID AND
            (_Status IS NULL OR "PointRedemptions"."Status" = _Status)
        ORDER BY "PointRedemptions"."CreatedAt" DESC
        LIMIT (CASE WHEN COALESCE(_RowLimit, 0) > 0 THEN _RowLimit ELSE NULL END);
    END;
$$ LANGUAGE plpgsql;
