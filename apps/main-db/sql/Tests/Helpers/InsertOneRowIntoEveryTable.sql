--
-- Writes one row into every table in dbo, in dependency order, reusing the
-- fixtures for the foreign keys it needs. Tests use it to prove each table is
-- writable and that the audit triggers fire everywhere.
--
-- A new table in dbo needs a line here, and Tests/Cases/Schema.sql will fail
-- until it gets one.
--

CREATE FUNCTION "test"."InsertOneRowIntoEveryTable" () RETURNS void AS $$
DECLARE
    _By varchar(64) := 'smoke';
    _OrganizationUUID uuid;
    _UserUUID uuid;
    _TeamUUID uuid;
    _PointUUID uuid;
    _BadgeUUID uuid;
    _BadgeCategoryUUID uuid;
    _BadgeEventUUID uuid;
    _BadgeGroupUUID uuid;
BEGIN
    INSERT INTO "dbo"."Organizations" ("Name", "CreatedBy") VALUES ('Smoke Organization', _By) RETURNING "OrganizationUUID" INTO _OrganizationUUID;
    INSERT INTO "dbo"."Users" ("Name", "LoginName", "CreatedBy") VALUES ('Smoke User', 'smoke', _By) RETURNING "UserUUID" INTO _UserUUID;
    INSERT INTO "dbo"."Teams" ("OrganizationUUID", "Name", "CreatedBy") VALUES (_OrganizationUUID, 'Smoke Team', _By) RETURNING "TeamUUID" INTO _TeamUUID;
    INSERT INTO "dbo"."Points" ("Name", "Description", "CreatedBy") VALUES ('Smoke Points', 'Smoke test point type.', _By) RETURNING "PointUUID" INTO _PointUUID;
    INSERT INTO "dbo"."BadgeCategories" ("Name", "CreatedBy") VALUES ('Smoke Category', _By) RETURNING "BadgeCategoryUUID" INTO _BadgeCategoryUUID;
    INSERT INTO "dbo"."Badges" ("Name", "Description", "BadgeCategoryUUID", "OwnerUUID", "CreatedBy") VALUES ('Smoke Badge', 'Smoke test badge.', _BadgeCategoryUUID, _UserUUID, _By) RETURNING "BadgeUUID" INTO _BadgeUUID;
    INSERT INTO "dbo"."BadgeEvents" ("Name", "Description", "CreatedBy") VALUES ('Smoke Event', 'Smoke test event.', _By) RETURNING "BadgeEventUUID" INTO _BadgeEventUUID;
    INSERT INTO "dbo"."BadgeGroups" ("Name", "Description", "CreatedBy") VALUES ('Smoke Group', 'Smoke test group.', _By) RETURNING "BadgeGroupUUID" INTO _BadgeGroupUUID;

    INSERT INTO "dbo"."BadgeCriteria" ("BadgeUUID", "Description", "BadgeType", "Value", "CreatedBy") VALUES (_BadgeUUID, 'Smoke criteria.', 'Activity', 1, _By);
    INSERT INTO "dbo"."BadgeEventCriteria" ("BadgeEventUUID", "BadgeUUID", "Description", "BadgeType", "Value", "CreatedBy") VALUES (_BadgeEventUUID, _BadgeUUID, 'Smoke event criteria.', 'Achievement', 1, _By);
    INSERT INTO "dbo"."BadgeGroupRelationships" ("BadgeUUID", "BadgeGroupUUID", "CreatedBy") VALUES (_BadgeUUID, _BadgeGroupUUID, _By);
    INSERT INTO "dbo"."BadgeAchievements" ("UserUUID", "BadgeUUID", "Description", "CreatedBy") VALUES (_UserUUID, _BadgeUUID, 'Smoke achievement.', _By);
    INSERT INTO "dbo"."BadgeReviews" ("BadgeUUID", "UserUUID", "Status", "Comment", "CreatedBy") VALUES (_BadgeUUID, _UserUUID, 'Pending', 'Smoke review.', _By);
    INSERT INTO "dbo"."BadgeStatistics" ("BadgeUUID", "UsersEarned", "LatestEarnings", "CreatedBy") VALUES (_BadgeUUID, 1, 1, _By);
    INSERT INTO "dbo"."SharedBadges" ("UserUUID", "BadgeUUID", "SharedWithUserUUID", "CreatedBy") VALUES (_UserUUID, _BadgeUUID, "test"."Fixture"('User.Member'), _By);

    INSERT INTO "dbo"."UserOrganizations" ("UserUUID", "OrganizationUUID", "CreatedBy") VALUES (_UserUUID, _OrganizationUUID, _By);
    INSERT INTO "dbo"."UserTeams" ("UserUUID", "TeamUUID", "CreatedBy") VALUES (_UserUUID, _TeamUUID, _By);
    INSERT INTO "dbo"."UserBadges" ("UserUUID", "OrganizationUUID", "BadgeUUID", "CreatedBy") VALUES (_UserUUID, _OrganizationUUID, _BadgeUUID, _By);

    -- The UserPoints insert fires calculate_tallies, which is what puts a row
    -- into UserTallies. Inserting into UserTallies directly would hide that.
    INSERT INTO "dbo"."UserPoints" ("UserUUID", "OrganizationUUID", "PointUUID", "Description", "Amount", "CreatedBy") VALUES (_UserUUID, _OrganizationUUID, _PointUUID, 'Smoke points.', 1.00, _By);
END;
$$ LANGUAGE plpgsql;
