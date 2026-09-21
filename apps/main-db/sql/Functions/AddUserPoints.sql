--
-- Write one row to the point ledger. A positive amount grants, a negative one
-- takes away.
--
-- Replaces AddPointsToUser, SpendPoints and RevokePointsFromUser, which were
-- the same procedure three times over with the sign flipped and slightly
-- different guards.
--
-- The drafts each wrote *two* rows: one to the ledger and one to the running
-- total, by hand. Here only the ledger row is written and
-- dbo.calculate_tallies maintains dbo.UserTallies from it. Two hand-maintained
-- copies of a balance is how they drift apart.
--
-- Granting and revoking are owner acts, so this checks IsOwnerOfOrganization
-- rather than plain membership. The drafts checked nothing at all.
--
-- _ApplyMultiplier scales the amount by dbo.GetPointMultiplier. It is opt-in:
-- a silent multiplier on every award would make the ledger unexplainable.
--
CREATE FUNCTION "dbo"."AddUserPoints" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _UserUUID uuid,
    _PointUUID uuid,
    _Amount decimal(19,4),
    _Description text,
    _Reason varchar(64) DEFAULT NULL,
    _Details jsonb DEFAULT NULL,
    _ExpiresAt timestamp with time zone DEFAULT NULL,
    _ApplyMultiplier boolean DEFAULT false
) RETURNS uuid AS $$
    DECLARE
        _IsOwnerOfOrganization boolean = "dbo"."IsOwnerOfOrganization"(_LoginName, _OrganizationUUID);
        _Applied decimal(19,4) = _Amount;
        _UserPointUUID uuid;
    BEGIN
        IF _IsOwnerOfOrganization IS NOT true THEN
            RAISE EXCEPTION 'AddUserPoints: % does not own this organization', _LoginName;
        END IF;

        IF _Amount = 0 THEN
            RAISE EXCEPTION 'AddUserPoints: amount must not be zero';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM "dbo"."UserOrganizations"
            WHERE "UserOrganizations"."UserUUID" = _UserUUID
                AND "UserOrganizations"."OrganizationUUID" = _OrganizationUUID
        ) THEN
            RAISE EXCEPTION 'AddUserPoints: that user does not belong to this organization';
        END IF;

        IF _ApplyMultiplier THEN
            _Applied := _Amount * "dbo"."GetPointMultiplier"(_LoginName, _OrganizationUUID);
        END IF;

        INSERT INTO "dbo"."UserPoints" (
            "UserUUID", "OrganizationUUID", "PointUUID", "Description",
            "Reason", "Details", "Amount", "ExpiresAt", "CreatedBy"
        ) VALUES (
            _UserUUID, _OrganizationUUID, _PointUUID, _Description,
            _Reason, _Details, _Applied, _ExpiresAt, _LoginName
        ) RETURNING "UserPoints"."UserPointUUID" INTO _UserPointUUID;

        RETURN _UserPointUUID;
    END;
$$ LANGUAGE plpgsql;
