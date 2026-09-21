CREATE OR REPLACE PROCEDURE CreateBadgeGroup(GroupName VARCHAR(100), BadgeIds INT[])
AS $$
DECLARE
    NewGroupId INT;
BEGIN
    -- Create a new badge group.
    INSERT INTO BadgeGroups (GroupName) VALUES (GroupName) RETURNING GroupId INTO NewGroupId;

    -- Associate badges with the newly created group.
    FOREACH BadgeId IN ARRAY BadgeIds
        LOOP
            INSERT INTO BadgeGroupAssociations (GroupId, BadgeId) VALUES (NewGroupId, BadgeId);
        END LOOP;
END;
$$ LANGUAGE plpgsql;
