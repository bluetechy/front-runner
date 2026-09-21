--
-- Give somebody a badge, or mark one they were working towards as earned.
--
-- From AwardBadgeToUser, which inserted a bare UserBadges row -- in the schema
-- as it now stands that would have created a row with a NULL "EarnedAt", which
-- means *in progress*, so the award would not have counted as held.
--
-- AssignBadgesInBulk did not come across: it looped over an array of users,
-- which is a caller's loop.
--
CREATE FUNCTION "dbo"."AwardBadgeToUser" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _UserUUID uuid,
    _BadgeUUID uuid,
    _EarnedDescription text DEFAULT NULL
) RETURNS uuid AS $$
    DECLARE
        _IsOwnerOfOrganization boolean = "dbo"."IsOwnerOfOrganization"(_LoginName, _OrganizationUUID);
    BEGIN
        IF _IsOwnerOfOrganization IS NOT true THEN
            RAISE EXCEPTION 'AwardBadgeToUser: % does not own this organization', _LoginName;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM "dbo"."UserOrganizations"
            WHERE "UserOrganizations"."UserUUID" = _UserUUID
                AND "UserOrganizations"."OrganizationUUID" = _OrganizationUUID
        ) THEN
            RAISE EXCEPTION 'AwardBadgeToUser: that user does not belong to this organization';
        END IF;

        INSERT INTO "dbo"."UserBadges" (
            "UserUUID", "OrganizationUUID", "BadgeUUID",
            "EarnedAt", "EarnedDescription", "CreatedBy"
        ) VALUES (
            _UserUUID, _OrganizationUUID, _BadgeUUID,
            now(), _EarnedDescription, _LoginName
        )
        ON CONFLICT ON CONSTRAINT "UserBadges_UUIDs_UniqueKey" DO UPDATE SET
            "EarnedAt" = COALESCE("UserBadges"."EarnedAt", now()),
            "EarnedDescription" = COALESCE(EXCLUDED."EarnedDescription", "UserBadges"."EarnedDescription"),
            "RevokedAt" = NULL,
            "UpdatedBy" = _LoginName;

        RETURN _BadgeUUID;
    END;
$$ LANGUAGE plpgsql;
