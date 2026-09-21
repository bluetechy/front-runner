--
-- Ask to send points to somebody. Records the request; moves nothing.
-- dbo.SettlePointTransfer is what moves it.
--
-- From TransferPoints and BulkTransferPoints. TransferPoints did the whole
-- thing in one step with no request, no approval and no check that the sender
-- could afford it. BulkTransferPoints looped over an array of recipients --
-- that is a caller's loop, not a database function.
--
-- The sender must be the caller: nobody sends somebody else's points.
--
CREATE FUNCTION "dbo"."RequestPointTransfer" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _ReceiverUserUUID uuid,
    _PointUUID uuid,
    _Amount decimal(19,4),
    _Description text DEFAULT NULL
) RETURNS uuid AS $$
    DECLARE
        _UserUUID uuid = "dbo"."GetUserUUID"(_LoginName);
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
        _Balance decimal(19,4);
        _PointTransferUUID uuid;
    BEGIN
        IF _IsMemberOfOrganization IS NOT true THEN
            RAISE EXCEPTION 'RequestPointTransfer: % does not belong to this organization', _LoginName;
        END IF;

        IF _Amount <= 0 THEN
            RAISE EXCEPTION 'RequestPointTransfer: amount must be positive';
        END IF;

        IF _ReceiverUserUUID = _UserUUID THEN
            RAISE EXCEPTION 'RequestPointTransfer: cannot send points to yourself';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM "dbo"."UserOrganizations"
            WHERE "UserOrganizations"."UserUUID" = _ReceiverUserUUID
                AND "UserOrganizations"."OrganizationUUID" = _OrganizationUUID
        ) THEN
            RAISE EXCEPTION 'RequestPointTransfer: the receiver does not belong to this organization';
        END IF;

        SELECT COALESCE("UserTallies"."Amount", 0) INTO _Balance FROM "dbo"."UserTallies"
        WHERE "UserTallies"."UserUUID" = _UserUUID
            AND "UserTallies"."OrganizationUUID" = _OrganizationUUID
            AND "UserTallies"."PointUUID" = _PointUUID;

        IF COALESCE(_Balance, 0) < _Amount THEN
            RAISE EXCEPTION 'RequestPointTransfer: insufficient balance';
        END IF;

        IF NOT "dbo"."CheckPointTransferLimit"(_LoginName, _OrganizationUUID, _PointUUID, _Amount) THEN
            RAISE EXCEPTION 'RequestPointTransfer: over the daily or monthly transfer limit';
        END IF;

        INSERT INTO "dbo"."PointTransfers" (
            "OrganizationUUID", "PointUUID", "SenderUserUUID", "ReceiverUserUUID",
            "Amount", "Description", "CreatedBy"
        ) VALUES (
            _OrganizationUUID, _PointUUID, _UserUUID, _ReceiverUserUUID,
            _Amount, _Description, _LoginName
        ) RETURNING "PointTransfers"."PointTransferUUID" INTO _PointTransferUUID;

        RETURN _PointTransferUUID;
    END;
$$ LANGUAGE plpgsql;
