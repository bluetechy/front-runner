--
-- An attachment hangs off a task or a comment, never both and never neither.
-- The draft left both columns nullable and said nothing.
--

CREATE FUNCTION "test"."TestAttachments_RejectNoOwner" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        'INSERT INTO "dbo"."Attachments" ("FileName", "FilePath", "CreatedBy") VALUES (''loose.txt'', ''/files/loose.txt'', ''test'')',
        'Attachments accepted a file belonging to nothing'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAttachments_RejectTwoOwners" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."Attachments" ("TaskUUID", "TaskCommentUUID", "FileName", "FilePath", "CreatedBy") VALUES (%L, %L, ''both.txt'', ''/files/both.txt'', ''test'')',
            "test"."Fixture"('Task.Build'),
            (SELECT "TaskCommentUUID" FROM "dbo"."TaskComments" WHERE "TaskUUID" = "test"."Fixture"('Task.Build'))
        ),
        'Attachments accepted a file owned by both a task and a comment'
    );
END;
$$ LANGUAGE plpgsql;

-- An attachment on a comment reaches its task through the comment, so both
-- kinds show up when you ask what is attached to a task.
CREATE FUNCTION "test"."TestAttachments_ReachTheTaskThroughEitherOwner" () RETURNS void AS $$
DECLARE
    _Names text;
BEGIN
    SELECT string_agg("FileName", ', ' ORDER BY "FileName") INTO _Names
    FROM "dbo"."Attachments"
        LEFT JOIN "dbo"."TaskComments" ON ("TaskComments"."TaskCommentUUID" = "Attachments"."TaskCommentUUID")
    WHERE COALESCE("Attachments"."TaskUUID", "TaskComments"."TaskUUID") = "test"."Fixture"('Task.Build');

    PERFORM "test"."AssertEquals"(_Names, 'screenshot.png, spec.pdf', 'both the task attachment and the comment attachment belong to the task');
END;
$$ LANGUAGE plpgsql;
