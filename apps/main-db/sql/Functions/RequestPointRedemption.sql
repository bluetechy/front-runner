--
-- Ask to spend points on something. Records the request; moves nothing.
-- dbo.SettlePointRedemption is what moves it.
--
-- From RedeemPoints, which checked affordability and then deducted the points
-- immediately *and* filed the redemption as 'Pending' -- so a redemption
-- awaiting approval had already been paid for, and rejecting it gave nothing
-- back. The check survives; the deduction moves to settlement.
--
-- RedeemPointsForReward and BulkRedeemPointsForRewards both read a Rewards
-- table that never existed anywhere. What a redemption is *for* is free text
-- here, as it is on dbo.PointRedemptions.
--
CREATE FUNCTION "dbo"."RequestPointRedemption" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _PointUUID uuid,
    _Amount decimal(19,4),
    _Description text
) RETURNS uuid AS $$
    DECLARE
        _UserUUID uuid = "dbo"."GetUserUUID"(_LoginName);
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
        _Balance decimal(19,4);
        _PointRedemptionUUID uuid;
    BEGIN
        IF _IsMemberOfOrganization IS NOT true THEN
            RAISE EXCEPTION 'RequestPointRedemption: % does not belong to this organization', _LoginName;
        END IF;

        IF _Amount <= 0 THEN
            RAISE EXCEPTION 'RequestPointRedemption: amount must be positive';
        END IF;

        SELECT COALESCE("UserTallies"."Amount", 0) INTO _Balance FROM "dbo"."UserTallies"
        WHERE "UserTallies"."UserUUID" = _UserUUID
            AND "UserTallies"."OrganizationUUID" = _OrganizationUUID
            AND "UserTallies"."PointUUID" = _PointUUID;

        IF COALESCE(_Balance, 0) < _Amount THEN
            RAISE EXCEPTION 'RequestPointRedemption: insufficient balance';
        END IF;

        INSERT INTO "dbo"."PointRedemptions" (
            "UserUUID", "OrganizationUUID", "PointUUID", "Amount", "Description", "CreatedBy"
        ) VALUES (
            _UserUUID, _OrganizationUUID, _PointUUID, _Amount, _Description, _LoginName
        ) RETURNING "PointRedemptions"."PointRedemptionUUID" INTO _PointRedemptionUUID;

        RETURN _PointRedemptionUUID;
    END;
$$ LANGUAGE plpgsql;
