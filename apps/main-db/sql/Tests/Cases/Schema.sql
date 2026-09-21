--
-- Structural tests. These answer "is every table still wired up correctly"
-- rather than "does this function return the right answer", so they are the
-- ones that notice a new table added without its triggers, a dropped foreign
-- key, or a file that silently stopped being applied by bin/apply.sh.
--

CREATE FUNCTION "test"."TestSchema_ExpectedTablesExist" () RETURNS void AS $$
DECLARE
    _Missing text;
    _Unexpected text;
BEGIN
    SELECT string_agg("Expected"."Name", ', ' ORDER BY "Expected"."Name") INTO _Missing
    FROM (VALUES
        ('AssignmentHistory'), ('BadgeAchievements'), ('BadgeCategories'),
        ('BadgeCriteria'), ('BadgeEventCriteria'), ('BadgeEvents'),
        ('BadgeGroupRelationships'), ('BadgeGroups'), ('BadgeReviews'),
        ('BadgeStatistics'), ('Badges'), ('Checklists'), ('Labels'), ('Organizations'),
        ('PointLevels'), ('PointMultipliers'), ('PointRedemptions'), ('PointTransfers'),
        ('Points'), ('Roadmaps'), ('SharedBadges'), ('TaskComments'), ('TaskDependencies'),
        ('TaskHistory'), ('TaskLabels'), ('Tasks'), ('Teams'), ('UserBadges'),
        ('UserOrganizations'), ('UserPointLevels'), ('UserPoints'), ('UserTallies'),
        ('UserTeams'), ('Users')
    ) AS "Expected" ("Name")
    WHERE NOT EXISTS (SELECT 1 FROM pg_tables WHERE "schemaname" = 'dbo' AND "tablename" = "Expected"."Name");

    PERFORM "test"."AssertEquals"(_Missing, NULL::text, 'tables missing from dbo');

    SELECT string_agg("tablename", ', ' ORDER BY "tablename") INTO _Unexpected
    FROM pg_tables
    WHERE "schemaname" = 'dbo'
        AND "tablename" NOT IN (
            'AssignmentHistory', 'BadgeAchievements', 'BadgeCategories', 'BadgeCriteria',
            'BadgeEventCriteria', 'BadgeEvents', 'BadgeGroupRelationships', 'BadgeGroups',
            'BadgeReviews', 'BadgeStatistics', 'Badges', 'Checklists', 'Labels',
            'Organizations', 'PointLevels', 'PointMultipliers', 'PointRedemptions',
            'PointTransfers', 'Points', 'Roadmaps', 'SharedBadges', 'TaskComments',
            'TaskDependencies', 'TaskHistory', 'TaskLabels', 'Tasks', 'Teams',
            'UserBadges', 'UserOrganizations', 'UserPointLevels', 'UserPoints',
            'UserTallies', 'UserTeams', 'Users'
        );

    PERFORM "test"."AssertEquals"(_Unexpected, NULL::text, 'tables in dbo that this test does not know about -- add them here and to test.InsertOneRowIntoEveryTable');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSchema_ExpectedFunctionsExist" () RETURNS void AS $$
DECLARE
    _Missing text;
BEGIN
    SELECT string_agg("Expected"."Name", ', ' ORDER BY "Expected"."Name") INTO _Missing
    FROM (VALUES
        ('AddOrganization'), ('AddTeam'), ('calculate_tallies'), ('GetBadges'),
        ('GetOrganizations'), ('GetPoints'), ('GetTallies'), ('GetTeams'), ('GetUser'),
        ('GetUsers'), ('GetUserUUID'), ('insert_modified_info'), ('IsManagerOfTeam'),
        ('IsMemberOfOrganization'), ('IsMemberOfTeam'), ('IsOwnerOfOrganization'),
        ('JoinOrganization'), ('JoinTeam'), ('LeaveOrganization'), ('LeaveTeam'),
        ('LoginUser'), ('update_modified_info')
    ) AS "Expected" ("Name")
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_proc
            JOIN pg_namespace ON ("pg_namespace"."oid" = "pg_proc"."pronamespace")
        WHERE "pg_namespace"."nspname" = 'dbo' AND "pg_proc"."proname" = "Expected"."Name"
    );

    PERFORM "test"."AssertEquals"(_Missing, NULL::text, 'functions missing from dbo');
END;
$$ LANGUAGE plpgsql;

-- Columns folded in from sql/Drafts. Most have no function reading them yet,
-- so nothing else in the suite would notice one being dropped -- this list is
-- what holds them in place until a reader exists. See SCHEMA-NOTES.md.
CREATE FUNCTION "test"."TestSchema_DraftColumnsExist" () RETURNS void AS $$
DECLARE
    _Missing text;
BEGIN
    SELECT string_agg(format('%s.%s', "Expected"."Table", "Expected"."Column"), ', ' ORDER BY "Expected"."Table", "Expected"."Column") INTO _Missing
    FROM (VALUES
        ('Points',      'ExpirationDuration', 'interval'),
        ('Points',      'ResetCondition',     'text'),
        ('UserBadges',  'EarnedAt',           'timestamp with time zone'),
        ('UserBadges',  'EarnedDescription',  'text'),
        ('UserBadges',  'ProgressGoal',       'integer'),
        ('UserBadges',  'ProgressCurrent',    'integer'),
        ('UserBadges',  'RevokedAt',          'timestamp with time zone'),
        ('UserPoints',  'Reason',             'character varying'),
        ('UserPoints',  'Details',            'jsonb'),
        ('UserTallies', 'DailyLimit',         'numeric'),
        ('UserTallies', 'SpendLimit',         'numeric')
    ) AS "Expected" ("Table", "Column", "Type")
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE "table_schema" = 'dbo'
            AND "table_name" = "Expected"."Table"
            AND "column_name" = "Expected"."Column"
            AND "data_type" = "Expected"."Type"
    );

    PERFORM "test"."AssertEquals"(_Missing, NULL::text, 'columns missing, or holding a different type than expected');
END;
$$ LANGUAGE plpgsql;

-- UserTallies is the one table without CreatedAt/CreatedBy: it is written
-- only by calculate_tallies, which upserts rather than inserting once.
CREATE FUNCTION "test"."TestSchema_EveryTableHasAuditColumns" () RETURNS void AS $$
DECLARE
    _Missing text;
BEGIN
    SELECT string_agg(format('%s.%s', "Tables"."tablename", "Columns"."Name"), ', ' ORDER BY "Tables"."tablename", "Columns"."Name") INTO _Missing
    FROM pg_tables AS "Tables"
        CROSS JOIN (VALUES ('CreatedAt'), ('CreatedBy'), ('UpdatedAt'), ('UpdatedBy')) AS "Columns" ("Name")
    WHERE "Tables"."schemaname" = 'dbo'
        AND NOT ("Tables"."tablename" = 'UserTallies' AND "Columns"."Name" IN ('CreatedAt', 'CreatedBy'))
        AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE "table_schema" = 'dbo'
                AND "table_name" = "Tables"."tablename"
                AND "column_name" = "Columns"."Name"
        );

    PERFORM "test"."AssertEquals"(_Missing, NULL::text, 'audit columns missing');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSchema_EveryTableHasModifiedInfoTriggers" () RETURNS void AS $$
DECLARE
    _Missing text;
BEGIN
    SELECT string_agg(format('%s_ModifiedInfo_%s', "Tables"."tablename", "Events"."Name"), ', ' ORDER BY "Tables"."tablename", "Events"."Name") INTO _Missing
    FROM pg_tables AS "Tables"
        CROSS JOIN (VALUES ('Insert'), ('Update')) AS "Events" ("Name")
    WHERE "Tables"."schemaname" = 'dbo'
        AND NOT EXISTS (
            SELECT 1 FROM pg_trigger
                JOIN pg_class ON ("pg_class"."oid" = "pg_trigger"."tgrelid")
                JOIN pg_namespace ON ("pg_namespace"."oid" = "pg_class"."relnamespace")
            WHERE "pg_namespace"."nspname" = 'dbo'
                AND "pg_class"."relname" = "Tables"."tablename"
                AND "pg_trigger"."tgname" = format('%s_ModifiedInfo_%s', "Tables"."tablename", "Events"."Name")
        );

    PERFORM "test"."AssertEquals"(_Missing, NULL::text, 'audit triggers missing');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSchema_ExpectedForeignKeysExist" () RETURNS void AS $$
DECLARE
    _Missing text;
BEGIN
    SELECT string_agg("Expected"."Name", ', ' ORDER BY "Expected"."Name") INTO _Missing
    FROM (VALUES
        ('FK_BadgeAchievements_Badges'), ('FK_BadgeAchievements_Users'),
        ('FK_BadgeCriteria_Badges'), ('FK_BadgeEventCriteria_BadgeEvents'),
        ('FK_BadgeEventCriteria_Badges'), ('FK_BadgeGroupRelationships_BadgeGroups'),
        ('FK_BadgeGroupRelationships_Badges'), ('FK_BadgeReviews_Badges'),
        ('FK_BadgeReviews_Users'), ('FK_BadgeStatistics_Badges'),
        ('FK_AssignmentHistory_Tasks'), ('FK_AssignmentHistory_Users_NewUserUUID'),
        ('FK_AssignmentHistory_Users_PreviousUserUUID'), ('FK_BadgeAchievements_Badges'),
        ('FK_BadgeAchievements_Users'), ('FK_BadgeCriteria_Badges'),
        ('FK_BadgeEventCriteria_BadgeEvents'), ('FK_BadgeEventCriteria_Badges'),
        ('FK_BadgeGroupRelationships_BadgeGroups'), ('FK_BadgeGroupRelationships_Badges'),
        ('FK_BadgeReviews_Badges'), ('FK_BadgeReviews_Users'),
        ('FK_BadgeStatistics_Badges'), ('FK_Checklists_Tasks'),
        ('FK_Labels_Organizations'), ('FK_PointLevels_Points'),
        ('FK_PointRedemptions_Organizations'), ('FK_PointRedemptions_Points'),
        ('FK_PointRedemptions_Users'), ('FK_PointTransfers_Organizations'),
        ('FK_PointTransfers_Points'), ('FK_PointTransfers_Users_ReceiverUserUUID'),
        ('FK_PointTransfers_Users_SenderUserUUID'), ('FK_Roadmaps_Organizations'),
        ('FK_SharedBadges_Badges'), ('FK_SharedBadges_Users'),
        ('FK_SharedBadges_Users_SharedWithUserUUID'), ('FK_TaskComments_Tasks'),
        ('FK_TaskComments_Users'), ('FK_TaskDependencies_Tasks_DependentTaskUUID'),
        ('FK_TaskDependencies_Tasks_PrerequisiteTaskUUID'), ('FK_TaskHistory_Tasks'),
        ('FK_TaskHistory_Users'), ('FK_TaskLabels_Labels'), ('FK_TaskLabels_Tasks'),
        ('FK_Tasks_Organizations'), ('FK_Tasks_Roadmaps'), ('FK_Tasks_Users'),
        ('FK_UserBadges_Badges'), ('FK_UserBadges_Organizations'), ('FK_UserBadges_Users'),
        ('FK_UserPointLevels_Organizations'), ('FK_UserPointLevels_PointLevels'),
        ('FK_UserPointLevels_Users')
    ) AS "Expected" ("Name")
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_constraint
            JOIN pg_namespace ON ("pg_namespace"."oid" = "pg_constraint"."connamespace")
        WHERE "pg_namespace"."nspname" = 'dbo'
            AND "pg_constraint"."contype" = 'f'
            AND "pg_constraint"."conname" = "Expected"."Name"
    );

    PERFORM "test"."AssertEquals"(_Missing, NULL::text, 'foreign keys missing -- ForeignKeys/*.sql may not have been applied');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSchema_EveryTableAcceptsAnInsert" () RETURNS void AS $$
DECLARE
    _Table record;
    _Count bigint;
    _Before jsonb := '{}'::jsonb;
BEGIN
    FOR _Table IN SELECT "tablename" FROM pg_tables WHERE "schemaname" = 'dbo' ORDER BY "tablename" LOOP
        EXECUTE format('SELECT count(*) FROM "dbo".%I', _Table."tablename") INTO _Count;
        _Before := jsonb_set(_Before, ARRAY[_Table."tablename"], to_jsonb(_Count));
    END LOOP;

    PERFORM "test"."InsertOneRowIntoEveryTable"();

    FOR _Table IN SELECT "tablename" FROM pg_tables WHERE "schemaname" = 'dbo' ORDER BY "tablename" LOOP
        EXECUTE format('SELECT count(*) FROM "dbo".%I', _Table."tablename") INTO _Count;
        PERFORM "test"."AssertEquals"(
            _Count,
            (_Before ->> _Table."tablename")::bigint + 1,
            format('dbo.%s did not gain exactly one row', _Table."tablename")
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Nothing in the fixtures or in InsertOneRowIntoEveryTable performs an update,
-- so after inserting into everything, every audit-carrying row in the database
-- should still read as created-and-updated by the same hand. A table whose
-- insert trigger is missing shows up here.
CREATE FUNCTION "test"."TestSchema_InsertTriggersMirrorAuditColumnsEverywhere" () RETURNS void AS $$
DECLARE
    _Table record;
    _Count bigint;
BEGIN
    PERFORM "test"."InsertOneRowIntoEveryTable"();

    FOR _Table IN
        SELECT "table_name" FROM information_schema.columns
        WHERE "table_schema" = 'dbo' AND "column_name" = 'CreatedBy'
        ORDER BY "table_name"
    LOOP
        EXECUTE format(
            'SELECT count(*) FROM "dbo".%I WHERE "UpdatedAt" IS DISTINCT FROM "CreatedAt" OR "UpdatedBy" IS DISTINCT FROM "CreatedBy"',
            _Table."table_name"
        ) INTO _Count;
        PERFORM "test"."AssertEquals"(_Count, 0::bigint, format('dbo.%s has rows where insert_modified_info did not mirror the audit columns', _Table."table_name"));
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSchema_ForeignKeysRejectUnknownReferences" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."UserBadges" ("UserUUID", "OrganizationUUID", "BadgeUUID", "CreatedBy") VALUES (%L, %L, %L, ''test'')',
            "test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), '00000000-0000-4000-8000-000000000000'
        ),
        'UserBadges accepted a badge that does not exist'
    );

    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."BadgeReviews" ("BadgeUUID", "UserUUID", "Status", "CreatedBy") VALUES (%L, %L, ''Pending'', ''test'')',
            "test"."Fixture"('Badge.Rookie'), '00000000-0000-4000-8000-000000000000'
        ),
        'BadgeReviews accepted a user that does not exist'
    );

    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."SharedBadges" ("UserUUID", "BadgeUUID", "SharedWithUserUUID", "CreatedBy") VALUES (%L, %L, %L, ''test'')',
            "test"."Fixture"('User.Member'), "test"."Fixture"('Badge.Rookie'), '00000000-0000-4000-8000-000000000000'
        ),
        'SharedBadges accepted a share target that does not exist'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSchema_UniqueKeysRejectDuplicates" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        'INSERT INTO "dbo"."Users" ("Name", "LoginName", "CreatedBy") VALUES (''Impostor'', ''member'', ''test'')',
        'Users accepted a duplicate LoginName'
    );

    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."UserOrganizations" ("UserUUID", "OrganizationUUID", "CreatedBy") VALUES (%L, %L, ''test'')',
            "test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme')
        ),
        'UserOrganizations accepted a duplicate membership'
    );

    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."UserTeams" ("UserUUID", "TeamUUID", "CreatedBy") VALUES (%L, %L, ''test'')',
            "test"."Fixture"('User.Member'), "test"."Fixture"('Team.Core')
        ),
        'UserTeams accepted a duplicate membership'
    );

    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."UserBadges" ("UserUUID", "OrganizationUUID", "BadgeUUID", "CreatedBy") VALUES (%L, %L, %L, ''test'')',
            "test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Badge.Rookie')
        ),
        'UserBadges accepted the same badge twice'
    );

    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."UserTallies" ("UserUUID", "OrganizationUUID", "PointUUID", "Amount") VALUES (%L, %L, %L, 1.0)',
            "test"."Fixture"('User.Member'), "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Point.Points')
        ),
        'UserTallies accepted a second tally for the same user and point type'
    );
END;
$$ LANGUAGE plpgsql;
