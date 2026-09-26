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
    _PointLevelUUID uuid;
    _RoadmapUUID uuid;
    _TaskUUID uuid;
    _LabelUUID uuid;
    _ApprovalWorkflowUUID uuid;
    _ApprovalWorkflowStageUUID uuid;
    _ApprovalRequestUUID uuid;
    _PointRedemptionUUID uuid;
    _SurveyUUID uuid;
    _SurveyQuestionUUID uuid;
    _SurveyQuestionOptionUUID uuid;
    _SurveyParticipantUUID uuid;
    _RoleUUID uuid;
    _TaskCommentUUID uuid;
    _WidgetUUID uuid;
BEGIN
    INSERT INTO "dbo"."Organizations" ("Name", "CreatedBy") VALUES ('Smoke Organization', _By) RETURNING "OrganizationUUID" INTO _OrganizationUUID;
    INSERT INTO "dbo"."Users" ("Name", "LoginName", "CreatedBy") VALUES ('Smoke User', 'smoke', _By) RETURNING "UserUUID" INTO _UserUUID;
    INSERT INTO "dbo"."UserProfiles" ("UserUUID", "Designation", "CreatedBy") VALUES (_UserUUID, 'Smoke Designation', _By);
    -- The address is written already folded and trimmed, which the table's
    -- check constraint requires: dbo.AddUserEmail is what normally folds one,
    -- and this helper writes rows directly to prove the table accepts them.
    INSERT INTO "dbo"."UserEmails" ("UserUUID", "Email", "IsPrimary", "VerifiedAt", "CreatedBy")
        VALUES (_UserUUID, 'smoke@example.test', true, CURRENT_TIMESTAMP, _By);
    -- A password reset names its account by Keycloak "sub" rather than by
    -- "UserUUID", so this row needs nothing from the user above. That is the
    -- table's point: a reset can exist for an account that has never signed in
    -- here and so has no row in dbo.Users at all.
    INSERT INTO "dbo"."PasswordResets" ("SubjectId", "Token", "CreatedBy")
        VALUES ('smoke-subject', 'smoke-reset-token', _By);
    INSERT INTO "dbo"."RecoveryCodes" ("SubjectId", "CodeHash", "BatchId", "CreatedBy")
        VALUES ('smoke-subject', 'smoke-recovery-code-hash', public.uuid_generate_v4(), _By);
    INSERT INTO "dbo"."PhoneVerifications" ("SubjectId", "PhoneNumber", "CodeHash", "CreatedBy")
        VALUES ('smoke-subject', '+15555550100', 'smoke-phone-code-hash', _By);
    -- The wallet, written directly rather than through dbo.AddCreditCard, because
    -- this helper's job is to prove the tables accept a row. The number is
    -- encrypted here the way the function would do it: the column is bytea, so
    -- there is no way to put a readable one in even by accident. The expiry is
    -- two years out rather than a literal, so this row never starts reading as
    -- an expired card as the suite ages.
    INSERT INTO "dbo"."CreditCards" ("UserUUID", "Brand", "NameOnCard", "Number", "Last4", "ExpirationMonth", "ExpirationYear", "CreatedBy")
        VALUES (_UserUUID, 'Visa', 'Smoke User', public.pgp_sym_encrypt('4111111111111111', 'smoke-key'), '1111', 4, (EXTRACT(year FROM CURRENT_DATE) + 2)::smallint, _By);
    INSERT INTO "dbo"."BankAccounts" ("UserUUID", "NameOnAccount", "AccountType", "RoutingNumber", "Number", "Last4", "CreatedBy")
        VALUES (_UserUUID, 'Smoke User', 'Checking', '021000021', public.pgp_sym_encrypt('000123456789', 'smoke-key'), '6789', _By);
    INSERT INTO "dbo"."Teams" ("OrganizationUUID", "Name", "CreatedBy") VALUES (_OrganizationUUID, 'Smoke Team', _By) RETURNING "TeamUUID" INTO _TeamUUID;
    INSERT INTO "dbo"."Points" ("Name", "Description", "CreatedBy") VALUES ('Smoke Points', 'Smoke test point type.', _By) RETURNING "PointUUID" INTO _PointUUID;
    INSERT INTO "dbo"."BadgeCategories" ("Name", "CreatedBy") VALUES ('Smoke Category', _By) RETURNING "BadgeCategoryUUID" INTO _BadgeCategoryUUID;
    INSERT INTO "dbo"."Badges" ("Name", "Description", "BadgeCategoryUUID", "OwnerUUID", "CreatedBy") VALUES ('Smoke Badge', 'Smoke test badge.', _BadgeCategoryUUID, _UserUUID, _By) RETURNING "BadgeUUID" INTO _BadgeUUID;
    INSERT INTO "dbo"."BadgeEvents" ("Name", "Description", "CreatedBy") VALUES ('Smoke Event', 'Smoke test event.', _By) RETURNING "BadgeEventUUID" INTO _BadgeEventUUID;
    INSERT INTO "dbo"."BadgeGroups" ("Name", "Description", "CreatedBy") VALUES ('Smoke Group', 'Smoke test group.', _By) RETURNING "BadgeGroupUUID" INTO _BadgeGroupUUID;
    INSERT INTO "dbo"."PointLevels" ("PointUUID", "Name", "Description", "MinimumAmount", "CreatedBy") VALUES (_PointUUID, 'Smoke Level', 'Smoke test level.', 1.0000, _By) RETURNING "PointLevelUUID" INTO _PointLevelUUID;
    INSERT INTO "dbo"."PointMultipliers" ("Name", "Description", "Factor", "CreatedBy") VALUES ('Smoke Multiplier', 'Smoke test multiplier.', 2.0000, _By);
    INSERT INTO "dbo"."Roadmaps" ("OrganizationUUID", "Name", "Description", "CreatedBy") VALUES (_OrganizationUUID, 'Smoke Roadmap', 'Smoke test roadmap.', _By) RETURNING "RoadmapUUID" INTO _RoadmapUUID;
    INSERT INTO "dbo"."Labels" ("OrganizationUUID", "Name", "CreatedBy") VALUES (_OrganizationUUID, 'Smoke Label', _By) RETURNING "LabelUUID" INTO _LabelUUID;
    INSERT INTO "dbo"."Roles" ("OrganizationUUID", "Name", "Description", "CreatedBy") VALUES (_OrganizationUUID, 'Smoke Role', 'Smoke test role.', _By) RETURNING "RoleUUID" INTO _RoleUUID;
    INSERT INTO "dbo"."UserRoles" ("UserUUID", "RoleUUID", "CreatedBy") VALUES (_UserUUID, _RoleUUID, _By);
    INSERT INTO "dbo"."EventLog" ("OrganizationUUID", "UserUUID", "EventType", "Description", "CreatedBy") VALUES (_OrganizationUUID, _UserUUID, 'Smoke', 'Smoke test event.', _By);
    INSERT INTO "dbo"."SecurityEvents" ("UserUUID", "EventType", "Description", "CreatedBy") VALUES (_UserUUID, 'Smoke', 'Smoke test security event.', _By);
    INSERT INTO "dbo"."ApprovalWorkflows" ("OrganizationUUID", "Name", "Description", "CreatedBy") VALUES (_OrganizationUUID, 'Smoke Workflow', 'Smoke test workflow.', _By) RETURNING "ApprovalWorkflowUUID" INTO _ApprovalWorkflowUUID;
    INSERT INTO "dbo"."ApprovalWorkflowStages" ("ApprovalWorkflowUUID", "Name", "CreatedBy") VALUES (_ApprovalWorkflowUUID, 'Smoke Stage', _By) RETURNING "ApprovalWorkflowStageUUID" INTO _ApprovalWorkflowStageUUID;
    INSERT INTO "dbo"."ApprovalWorkflowPermissions" ("ApprovalWorkflowStageUUID", "UserUUID", "CreatedBy") VALUES (_ApprovalWorkflowStageUUID, _UserUUID, _By);
    INSERT INTO "dbo"."Surveys" ("OrganizationUUID", "Name", "Description", "CreatedBy") VALUES (_OrganizationUUID, 'Smoke Survey', 'Smoke test survey.', _By) RETURNING "SurveyUUID" INTO _SurveyUUID;
    INSERT INTO "dbo"."SurveyQuestions" ("SurveyUUID", "QuestionText", "QuestionType", "CreatedBy") VALUES (_SurveyUUID, 'Smoke question?', 'Choice', _By) RETURNING "SurveyQuestionUUID" INTO _SurveyQuestionUUID;
    INSERT INTO "dbo"."SurveyQuestionOptions" ("SurveyQuestionUUID", "OptionText", "CreatedBy") VALUES (_SurveyQuestionUUID, 'Smoke option.', _By) RETURNING "SurveyQuestionOptionUUID" INTO _SurveyQuestionOptionUUID;
    INSERT INTO "dbo"."SurveyParticipants" ("SurveyUUID", "UserUUID", "CreatedBy") VALUES (_SurveyUUID, _UserUUID, _By) RETURNING "SurveyParticipantUUID" INTO _SurveyParticipantUUID;
    INSERT INTO "dbo"."SurveyAnswers" ("SurveyParticipantUUID", "SurveyQuestionUUID", "SurveyQuestionOptionUUID", "CreatedBy") VALUES (_SurveyParticipantUUID, _SurveyQuestionUUID, _SurveyQuestionOptionUUID, _By);

    INSERT INTO "dbo"."BadgeCriteria" ("BadgeUUID", "Description", "BadgeType", "Value", "CreatedBy") VALUES (_BadgeUUID, 'Smoke criteria.', 'Activity', 1, _By);
    INSERT INTO "dbo"."BadgeEventCriteria" ("BadgeEventUUID", "BadgeUUID", "Description", "BadgeType", "Value", "CreatedBy") VALUES (_BadgeEventUUID, _BadgeUUID, 'Smoke event criteria.', 'Achievement', 1, _By);
    INSERT INTO "dbo"."BadgeGroupRelationships" ("BadgeUUID", "BadgeGroupUUID", "CreatedBy") VALUES (_BadgeUUID, _BadgeGroupUUID, _By);
    INSERT INTO "dbo"."BadgeAchievements" ("UserUUID", "BadgeUUID", "Description", "CreatedBy") VALUES (_UserUUID, _BadgeUUID, 'Smoke achievement.', _By);
    INSERT INTO "dbo"."BadgeReviews" ("BadgeUUID", "UserUUID", "Status", "Comment", "CreatedBy") VALUES (_BadgeUUID, _UserUUID, 'Pending', 'Smoke review.', _By);
    INSERT INTO "dbo"."BadgeStatistics" ("BadgeUUID", "UsersEarned", "LatestEarnings", "CreatedBy") VALUES (_BadgeUUID, 1, 1, _By);
    INSERT INTO "dbo"."SharedBadges" ("UserUUID", "BadgeUUID", "SharedWithUserUUID", "CreatedBy") VALUES (_UserUUID, _BadgeUUID, "test"."Fixture"('User.Member'), _By);

    INSERT INTO "dbo"."UserOrganizations" ("UserUUID", "OrganizationUUID", "CreatedBy") VALUES (_UserUUID, _OrganizationUUID, _By);
    -- An address nobody holds, so the invitation stays Pending and no other
    -- test's dbo.GetUserInvitations picks it up.
    INSERT INTO "dbo"."OrganizationInvitations" ("OrganizationUUID", "Email", "InvitedByUserUUID", "CreatedBy") VALUES (_OrganizationUUID, 'smoke@example.test', _UserUUID, _By);
    INSERT INTO "dbo"."UserTeams" ("UserUUID", "TeamUUID", "CreatedBy") VALUES (_UserUUID, _TeamUUID, _By);
    INSERT INTO "dbo"."UserBadges" ("UserUUID", "OrganizationUUID", "BadgeUUID", "CreatedBy") VALUES (_UserUUID, _OrganizationUUID, _BadgeUUID, _By);
    INSERT INTO "dbo"."UserPointLevels" ("UserUUID", "OrganizationUUID", "PointLevelUUID", "CreatedBy") VALUES (_UserUUID, _OrganizationUUID, _PointLevelUUID, _By);
    INSERT INTO "dbo"."PointRedemptions" ("UserUUID", "OrganizationUUID", "PointUUID", "Amount", "Description", "CreatedBy") VALUES (_UserUUID, _OrganizationUUID, _PointUUID, 1.0000, 'Smoke redemption.', _By) RETURNING "PointRedemptionUUID" INTO _PointRedemptionUUID;
    INSERT INTO "dbo"."PointTransfers" ("OrganizationUUID", "PointUUID", "SenderUserUUID", "ReceiverUserUUID", "Amount", "Description", "CreatedBy") VALUES (_OrganizationUUID, _PointUUID, _UserUUID, "test"."Fixture"('User.Member'), 1.0000, 'Smoke transfer.', _By);

    -- TaskDependencies needs two tasks, but every table here has to gain
    -- exactly one row, so the other end is a fixture task.
    INSERT INTO "dbo"."Tasks" ("OrganizationUUID", "RoadmapUUID", "Name", "Description", "AssignedUserUUID", "CreatedBy") VALUES (_OrganizationUUID, _RoadmapUUID, 'Smoke Task', 'Smoke test task.', _UserUUID, _By) RETURNING "TaskUUID" INTO _TaskUUID;
    INSERT INTO "dbo"."TaskDependencies" ("DependentTaskUUID", "PrerequisiteTaskUUID", "CreatedBy") VALUES (_TaskUUID, "test"."Fixture"('Task.Design'), _By);
    INSERT INTO "dbo"."TaskComments" ("TaskUUID", "UserUUID", "Comment", "CreatedBy") VALUES (_TaskUUID, _UserUUID, 'Smoke comment.', _By) RETURNING "TaskCommentUUID" INTO _TaskCommentUUID;
    INSERT INTO "dbo"."TaskHistory" ("TaskUUID", "UserUUID", "ChangeType", "OldValue", "NewValue", "CreatedBy") VALUES (_TaskUUID, _UserUUID, 'Status', 'Pending', 'InProgress', _By);
    INSERT INTO "dbo"."TaskLabels" ("TaskUUID", "LabelUUID", "CreatedBy") VALUES (_TaskUUID, _LabelUUID, _By);
    INSERT INTO "dbo"."AssignmentHistory" ("TaskUUID", "PreviousUserUUID", "NewUserUUID", "CreatedBy") VALUES (_TaskUUID, NULL, _UserUUID, _By);
    INSERT INTO "dbo"."Checklists" ("TaskUUID", "Description", "CreatedBy") VALUES (_TaskUUID, 'Smoke checklist item.', _By);
    INSERT INTO "dbo"."AccessControlLists" ("UserUUID", "TaskUUID", "PermissionType", "CreatedBy") VALUES (_UserUUID, _TaskUUID, 'Read', _By);
    INSERT INTO "dbo"."Notifications" ("UserUUID", "OrganizationUUID", "TaskUUID", "NotificationType", "Message", "CreatedBy") VALUES (_UserUUID, _OrganizationUUID, _TaskUUID, 'Assigned', 'Smoke notification.', _By);
    -- Exactly one owner, so this one hangs off the comment and not the task.
    INSERT INTO "dbo"."Attachments" ("TaskCommentUUID", "FileName", "FilePath", "CreatedBy") VALUES (_TaskCommentUUID, 'smoke.txt', '/tmp/smoke.txt', _By);

    -- The request approves the redemption above. Exactly one subject column
    -- may be set, so the other two stay NULL.
    INSERT INTO "dbo"."ApprovalRequests" ("OrganizationUUID", "ApprovalWorkflowUUID", "CurrentStageUUID", "RequestedByUserUUID", "RequestText", "PointRedemptionUUID", "CreatedBy")
    VALUES (_OrganizationUUID, _ApprovalWorkflowUUID, _ApprovalWorkflowStageUUID, _UserUUID, 'Smoke request.', _PointRedemptionUUID, _By) RETURNING "ApprovalRequestUUID" INTO _ApprovalRequestUUID;
    INSERT INTO "dbo"."ApprovalDecisions" ("ApprovalRequestUUID", "ApprovalWorkflowStageUUID", "ApproverUserUUID", "Status", "Comment", "CreatedBy") VALUES (_ApprovalRequestUUID, _ApprovalWorkflowStageUUID, _UserUUID, 'Approved', 'Smoke decision.', _By);
    INSERT INTO "dbo"."ApprovalRequestLogs" ("ApprovalRequestUUID", "FromStageUUID", "ToStageUUID", "Comment", "CreatedBy") VALUES (_ApprovalRequestUUID, NULL, _ApprovalWorkflowStageUUID, 'Smoke log.', _By);

    -- The UserPoints insert fires calculate_tallies, which is what puts a row
    -- into UserTallies. Inserting into UserTallies directly would hide that.
    INSERT INTO "dbo"."UserPoints" ("UserUUID", "OrganizationUUID", "PointUUID", "Description", "Amount", "CreatedBy") VALUES (_UserUUID, _OrganizationUUID, _PointUUID, 'Smoke points.', 1.00, _By);

    -- A widget and the first version of it. Two statements rather than one
    -- because the version names the widget, and the widget's two version
    -- columns then name the version: dbo.SaveWidget and dbo.PublishWidget write
    -- exactly this pair between them, and this helper proves both tables accept
    -- a row without going through either.
    INSERT INTO "dbo"."Widgets" ("WidgetId", "UserUUID", "Name", "DraftVersion", "PublishedVersion", "CreatedBy")
        VALUES ('w_00000000000000000000000000000001', _UserUUID, 'Smoke Widget', 1, 1, _By)
        RETURNING "WidgetUUID" INTO _WidgetUUID;
    INSERT INTO "dbo"."WidgetVersions" ("WidgetUUID", "Version", "SchemaVersion", "Definition", "CreatedBy")
        VALUES (_WidgetUUID, 1, '1.0', '{"schemaVersion": "1.0", "canvas": {"width": 600}, "root": {"id": "root", "type": "container"}}'::jsonb, _By);

END;
$$ LANGUAGE plpgsql;
