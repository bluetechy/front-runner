--
-- Create a badge group. From CreateBadgeGroup, which inserted the group and
-- nothing else; this also takes the badges that go in it, because a group with
-- no badges is the state dbo.GetBadgeGroups reports as 0 of 0.
--
CREATE FUNCTION "dbo"."CreateBadgeGroup" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _Name varchar(64),
    _Description text DEFAULT NULL,
    _BadgeUUIDs uuid[] DEFAULT NULL
) RETURNS uuid AS $$
    DECLARE
        _IsOwnerOfOrganization boolean = "dbo"."IsOwnerOfOrganization"(_LoginName, _OrganizationUUID);
        _BadgeGroupUUID uuid;
    BEGIN
        IF _IsOwnerOfOrganization IS NOT true THEN
            RAISE EXCEPTION 'CreateBadgeGroup: % does not own this organization', _LoginName;
        END IF;

        INSERT INTO "dbo"."BadgeGroups" ("Name", "Description", "CreatedBy")
        VALUES (_Name, _Description, _LoginName)
        RETURNING "BadgeGroups"."BadgeGroupUUID" INTO _BadgeGroupUUID;

        IF _BadgeUUIDs IS NOT NULL THEN
            INSERT INTO "dbo"."BadgeGroupRelationships" ("BadgeUUID", "BadgeGroupUUID", "CreatedBy")
            SELECT DISTINCT "Wanted", _BadgeGroupUUID, _LoginName
            FROM unnest(_BadgeUUIDs) AS "Wanted";
        END IF;

        RETURN _BadgeGroupUUID;
    END;
$$ LANGUAGE plpgsql;
