--
-- dbo.TaskLabels is not from the drafts: Drafts/Tables/Labels.sql defines
-- labels and nothing that wears one. These prove the join does the job the
-- label table was missing.
--

CREATE FUNCTION "test"."TestTaskLabels_ListTheTasksCarryingALabel" () RETURNS void AS $$
DECLARE
    _Names text;
BEGIN
    SELECT string_agg("Tasks"."Name", ', ' ORDER BY "Tasks"."Name") INTO _Names
    FROM "dbo"."TaskLabels"
        JOIN "dbo"."Tasks" ON ("Tasks"."TaskUUID" = "TaskLabels"."TaskUUID")
    WHERE "TaskLabels"."LabelUUID" = "test"."Fixture"('Label.Urgent');

    PERFORM "test"."AssertEquals"(_Names, 'Build, Ship', 'two tasks are labelled Urgent');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestTaskLabels_AllowSeveralLabelsOnATask" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    INSERT INTO "dbo"."TaskLabels" ("TaskUUID", "LabelUUID", "CreatedBy")
    VALUES ("test"."Fixture"('Task.Build'), "test"."Fixture"('Label.Chore'), 'test');

    SELECT count(*) INTO _Count FROM "dbo"."TaskLabels" WHERE "TaskUUID" = "test"."Fixture"('Task.Build');
    PERFORM "test"."AssertEquals"(_Count, 2::bigint, 'a task should be able to carry more than one label');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestTaskLabels_RejectTheSameLabelTwice" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."TaskLabels" ("TaskUUID", "LabelUUID", "CreatedBy") VALUES (%L, %L, ''test'')',
            "test"."Fixture"('Task.Build'), "test"."Fixture"('Label.Urgent')
        ),
        'TaskLabels accepted the same label on a task twice'
    );
END;
$$ LANGUAGE plpgsql;

-- Labels are per-organization, so two organizations can both have an "Urgent".
CREATE FUNCTION "test"."TestLabels_AllowTheSameNameInAnotherOrganization" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    INSERT INTO "dbo"."Labels" ("OrganizationUUID", "Name", "CreatedBy")
    VALUES ("test"."Fixture"('Organization.Disabled'), 'Urgent', 'test');

    SELECT count(*) INTO _Count FROM "dbo"."Labels" WHERE "Name" = 'Urgent';
    PERFORM "test"."AssertEquals"(_Count, 2::bigint, 'Urgent should exist in both organizations');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestLabels_RejectADuplicateNameInOneOrganization" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."Labels" ("OrganizationUUID", "Name", "CreatedBy") VALUES (%L, ''Urgent'', ''test'')',
            "test"."Fixture"('Organization.Acme')
        ),
        'Labels accepted two labels of the same name in one organization'
    );
END;
$$ LANGUAGE plpgsql;
