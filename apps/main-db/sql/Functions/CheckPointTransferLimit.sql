--
-- Would sending this many points break the sender's daily or monthly transfer
-- cap? True means the transfer is within both.
--
-- From CheckPointTransferLimits, which was the largest draft in the folder and
-- read two tables that never existed: UserPointTransferLimits (the caps) and a
-- PointTransfers carrying PointsChange and TransactionReason. The caps are
-- dbo.UserTallies."DailyTransferLimit" and "MonthlyTransferLimit", added with
-- this function; the transfers are dbo.PointTransfers.
--
-- A NULL cap means no cap, so a user with no tally row for the point type is
-- unlimited. Only Completed transfers count against the caps -- a Pending one
-- has not left yet.
--
-- The draft compared against the calendar month by EXTRACT(MONTH ...), which
-- matches the same month in any year. This uses the current month proper.
--
CREATE FUNCTION "dbo"."CheckPointTransferLimit" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _PointUUID uuid,
    _Amount decimal(19,4)
) RETURNS boolean AS $$
    DECLARE
        _UserUUID uuid = "dbo"."GetUserUUID"(_LoginName);
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
        _DailyLimit decimal(19,4);
        _MonthlyLimit decimal(19,4);
        _SentToday decimal(19,4);
        _SentThisMonth decimal(19,4);
    BEGIN
        IF _IsMemberOfOrganization IS NOT true THEN
            RETURN false;
        END IF;

        SELECT "UserTallies"."DailyTransferLimit", "UserTallies"."MonthlyTransferLimit"
        INTO _DailyLimit, _MonthlyLimit
        FROM "dbo"."UserTallies"
        WHERE "UserTallies"."UserUUID" = _UserUUID
            AND "UserTallies"."OrganizationUUID" = _OrganizationUUID
            AND "UserTallies"."PointUUID" = _PointUUID;

        SELECT
            COALESCE(SUM("PointTransfers"."Amount") FILTER (WHERE "PointTransfers"."TransferredAt" >= date_trunc('day', now())), 0),
            COALESCE(SUM("PointTransfers"."Amount") FILTER (WHERE "PointTransfers"."TransferredAt" >= date_trunc('month', now())), 0)
        INTO _SentToday, _SentThisMonth
        FROM "dbo"."PointTransfers"
        WHERE "PointTransfers"."SenderUserUUID" = _UserUUID
            AND "PointTransfers"."OrganizationUUID" = _OrganizationUUID
            AND "PointTransfers"."PointUUID" = _PointUUID
            AND "PointTransfers"."Status" = 'Completed';

        RETURN (_DailyLimit IS NULL OR _SentToday + _Amount <= _DailyLimit)
           AND (_MonthlyLimit IS NULL OR _SentThisMonth + _Amount <= _MonthlyLimit);
    END;
$$ LANGUAGE plpgsql;
