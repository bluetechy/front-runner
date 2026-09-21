--
-- Transfers a user sent or received. From GetPointTransferHistory.
--
-- "Direction" is what the draft lacked and every caller would have had to work
-- out: 'Sent' or 'Received', relative to the calling user.
--
-- As with redemptions, a transfer marked Completed has still not moved a
-- balance -- see SCHEMA-NOTES.md.
--
CREATE FUNCTION "dbo"."GetPointTransfers" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _Status varchar(20) DEFAULT NULL,
    _RowLimit integer DEFAULT NULL
) RETURNS TABLE(
    "PointTransferUUID" uuid,
    "Direction" text,
    "SenderUserUUID" uuid,
    "SenderName" varchar(64),
    "ReceiverUserUUID" uuid,
    "ReceiverName" varchar(64),
    "PointUUID" uuid,
    "Amount" decimal(19,4),
    "Description" text,
    "Status" varchar(20),
    "TransferredAt" timestamp with time zone,
    "CreatedAt" timestamp with time zone
) AS $$
    DECLARE
        _UserUUID uuid = "dbo"."GetUserUUID"(_LoginName);
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
    BEGIN
        RETURN QUERY
        SELECT
            "PointTransfers"."PointTransferUUID",
            CASE WHEN "PointTransfers"."SenderUserUUID" = _UserUUID THEN 'Sent' ELSE 'Received' END,
            "PointTransfers"."SenderUserUUID",
            "Sender"."Name",
            "PointTransfers"."ReceiverUserUUID",
            "Receiver"."Name",
            "PointTransfers"."PointUUID",
            "PointTransfers"."Amount",
            "PointTransfers"."Description",
            "PointTransfers"."Status",
            "PointTransfers"."TransferredAt",
            "PointTransfers"."CreatedAt"
        FROM
            "dbo"."PointTransfers"
            LEFT JOIN "dbo"."Users" AS "Sender" ON ("Sender"."UserUUID" = "PointTransfers"."SenderUserUUID")
            LEFT JOIN "dbo"."Users" AS "Receiver" ON ("Receiver"."UserUUID" = "PointTransfers"."ReceiverUserUUID")
        WHERE
            _IsMemberOfOrganization = true AND
            "PointTransfers"."OrganizationUUID" = _OrganizationUUID AND
            (_UserUUID IN ("PointTransfers"."SenderUserUUID", "PointTransfers"."ReceiverUserUUID")) AND
            (_Status IS NULL OR "PointTransfers"."Status" = _Status)
        ORDER BY "PointTransfers"."CreatedAt" DESC
        LIMIT (CASE WHEN COALESCE(_RowLimit, 0) > 0 THEN _RowLimit ELSE NULL END);
    END;
$$ LANGUAGE plpgsql;
