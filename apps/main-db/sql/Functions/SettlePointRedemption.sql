--
-- Approve or reject a pending redemption. Approving is the step that spends
-- the points: it writes the negative dbo.UserPoints row, and
-- dbo.calculate_tallies takes it into the tally.
--
-- Until this existed a PointRedemptions row marked Approved had changed
-- nobody's balance. Rejecting costs nothing, which is the whole reason the
-- deduction belongs here and not in dbo.RequestPointRedemption.
--
-- The balance is checked again: it may have moved between request and
-- approval.
--
CREATE FUNCTION "dbo"."SettlePointRedemption" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _PointRedemptionUUID uuid,
    _Approve boolean
) RETURNS varchar(20) AS $$
    DECLARE
        _IsOwnerOfOrganization boolean = "dbo"."IsOwnerOfOrganization"(_LoginName, _OrganizationUUID);
        _Redemption record;
        _Balance decimal(19,4);
    BEGIN
        IF _IsOwnerOfOrganization IS NOT true THEN
            RAISE EXCEPTION 'SettlePointRedemption: % does not own this organization', _LoginName;
        END IF;

        SELECT * INTO _Redemption FROM "dbo"."PointRedemptions"
        WHERE "PointRedemptions"."PointRedemptionUUID" = _PointRedemptionUUID
            AND "PointRedemptions"."OrganizationUUID" = _OrganizationUUID;

        IF _Redemption IS NULL THEN
            RAISE EXCEPTION 'SettlePointRedemption: no such redemption in this organization';
        END IF;

        IF _Redemption."Status" <> 'Pending' THEN
            RAISE EXCEPTION 'SettlePointRedemption: that redemption is already %', _Redemption."Status";
        END IF;

        IF NOT _Approve THEN
            UPDATE "dbo"."PointRedemptions"
            SET "Status" = 'Rejected', "UpdatedBy" = _LoginName
            WHERE "PointRedemptions"."PointRedemptionUUID" = _PointRedemptionUUID;
            RETURN 'Rejected';
        END IF;

        SELECT COALESCE("UserTallies"."Amount", 0) INTO _Balance FROM "dbo"."UserTallies"
        WHERE "UserTallies"."UserUUID" = _Redemption."UserUUID"
            AND "UserTallies"."OrganizationUUID" = _OrganizationUUID
            AND "UserTallies"."PointUUID" = _Redemption."PointUUID";

        IF COALESCE(_Balance, 0) < _Redemption."Amount" THEN
            RAISE EXCEPTION 'SettlePointRedemption: the balance no longer covers this redemption';
        END IF;

        INSERT INTO "dbo"."UserPoints" (
            "UserUUID", "OrganizationUUID", "PointUUID", "Description", "Reason", "Details", "Amount", "CreatedBy"
        ) VALUES (
            _Redemption."UserUUID", _OrganizationUUID, _Redemption."PointUUID",
            _Redemption."Description", 'Redeemed',
            jsonb_build_object('PointRedemptionUUID', _PointRedemptionUUID),
            -_Redemption."Amount", _LoginName
        );

        UPDATE "dbo"."PointRedemptions"
        SET "Status" = 'Approved', "RedeemedAt" = now(), "UpdatedBy" = _LoginName
        WHERE "PointRedemptions"."PointRedemptionUUID" = _PointRedemptionUUID;

        RETURN 'Approved';
    END;
$$ LANGUAGE plpgsql;
