--
-- Undo a ledger row by writing its negation. The original stays: this is a
-- correcting entry, not a delete.
--
-- From ReversePointTransaction, which wrote the negation and nothing more --
-- so the same transaction could be reversed any number of times, each one
-- moving the balance again. "ReversesUserPointUUID" is unique, so the second
-- attempt fails.
--
CREATE FUNCTION "dbo"."ReverseUserPoints" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _UserPointUUID uuid,
    _Description text DEFAULT NULL
) RETURNS uuid AS $$
    DECLARE
        _IsOwnerOfOrganization boolean = "dbo"."IsOwnerOfOrganization"(_LoginName, _OrganizationUUID);
        _Original record;
        _ReversalUUID uuid;
    BEGIN
        IF _IsOwnerOfOrganization IS NOT true THEN
            RAISE EXCEPTION 'ReverseUserPoints: % does not own this organization', _LoginName;
        END IF;

        SELECT * INTO _Original FROM "dbo"."UserPoints"
        WHERE "UserPoints"."UserPointUUID" = _UserPointUUID
            AND "UserPoints"."OrganizationUUID" = _OrganizationUUID;

        IF _Original IS NULL THEN
            RAISE EXCEPTION 'ReverseUserPoints: no such point row in this organization';
        END IF;

        IF _Original."ReversesUserPointUUID" IS NOT NULL THEN
            RAISE EXCEPTION 'ReverseUserPoints: that row is itself a reversal';
        END IF;

        INSERT INTO "dbo"."UserPoints" (
            "UserUUID", "OrganizationUUID", "PointUUID", "Description",
            "Reason", "Details", "Amount", "ReversesUserPointUUID", "CreatedBy"
        ) VALUES (
            _Original."UserUUID", _Original."OrganizationUUID", _Original."PointUUID",
            COALESCE(_Description, 'Reversal of: ' || _Original."Description"),
            'Reversal', _Original."Details", -_Original."Amount", _UserPointUUID, _LoginName
        ) RETURNING "UserPoints"."UserPointUUID" INTO _ReversalUUID;

        RETURN _ReversalUUID;
    END;
$$ LANGUAGE plpgsql;
