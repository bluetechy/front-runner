--
-- Approve or cancel a pending transfer. Approving is the step that finally
-- moves points: it writes the matching pair of dbo.UserPoints rows, one
-- negative for the sender and one positive for the receiver, and
-- dbo.calculate_tallies carries both into the tallies.
--
-- Until this existed a PointTransfers row marked Completed had changed nobody's
-- balance -- the gap SCHEMA-NOTES.md has been recording since the table landed.
--
-- From ConfirmPointTransfer and ApprovePointTransferRequest, which both read a
-- PointTransferRequests table that never existed. ConfirmPointTransfer also
-- updated the two totals by hand without touching a ledger, so the balance and
-- its history disagreed from then on. ApprovePointTransferRequest deleted the
-- request on rejection, losing the record; this marks it Cancelled.
--
CREATE FUNCTION "dbo"."SettlePointTransfer" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _PointTransferUUID uuid,
    _Approve boolean
) RETURNS varchar(20) AS $$
    DECLARE
        _IsOwnerOfOrganization boolean = "dbo"."IsOwnerOfOrganization"(_LoginName, _OrganizationUUID);
        _Transfer record;
        _Balance decimal(19,4);
    BEGIN
        IF _IsOwnerOfOrganization IS NOT true THEN
            RAISE EXCEPTION 'SettlePointTransfer: % does not own this organization', _LoginName;
        END IF;

        SELECT * INTO _Transfer FROM "dbo"."PointTransfers"
        WHERE "PointTransfers"."PointTransferUUID" = _PointTransferUUID
            AND "PointTransfers"."OrganizationUUID" = _OrganizationUUID;

        IF _Transfer IS NULL THEN
            RAISE EXCEPTION 'SettlePointTransfer: no such transfer in this organization';
        END IF;

        IF _Transfer."Status" <> 'Pending' THEN
            RAISE EXCEPTION 'SettlePointTransfer: that transfer is already %', _Transfer."Status";
        END IF;

        IF NOT _Approve THEN
            UPDATE "dbo"."PointTransfers"
            SET "Status" = 'Cancelled', "UpdatedBy" = _LoginName
            WHERE "PointTransfers"."PointTransferUUID" = _PointTransferUUID;
            RETURN 'Cancelled';
        END IF;

        SELECT COALESCE("UserTallies"."Amount", 0) INTO _Balance FROM "dbo"."UserTallies"
        WHERE "UserTallies"."UserUUID" = _Transfer."SenderUserUUID"
            AND "UserTallies"."OrganizationUUID" = _OrganizationUUID
            AND "UserTallies"."PointUUID" = _Transfer."PointUUID";

        IF COALESCE(_Balance, 0) < _Transfer."Amount" THEN
            RAISE EXCEPTION 'SettlePointTransfer: the sender can no longer afford this transfer';
        END IF;

        INSERT INTO "dbo"."UserPoints" ("UserUUID", "OrganizationUUID", "PointUUID", "Description", "Reason", "Details", "Amount", "CreatedBy") VALUES
            (_Transfer."SenderUserUUID", _OrganizationUUID, _Transfer."PointUUID",
             COALESCE(_Transfer."Description", 'Transfer out'), 'Transfer',
             jsonb_build_object('PointTransferUUID', _PointTransferUUID, 'Direction', 'Sent'),
             -_Transfer."Amount", _LoginName),
            (_Transfer."ReceiverUserUUID", _OrganizationUUID, _Transfer."PointUUID",
             COALESCE(_Transfer."Description", 'Transfer in'), 'Transfer',
             jsonb_build_object('PointTransferUUID', _PointTransferUUID, 'Direction', 'Received'),
             _Transfer."Amount", _LoginName);

        UPDATE "dbo"."PointTransfers"
        SET "Status" = 'Completed', "TransferredAt" = now(), "UpdatedBy" = _LoginName
        WHERE "PointTransfers"."PointTransferUUID" = _PointTransferUUID;

        RETURN 'Completed';
    END;
$$ LANGUAGE plpgsql;
