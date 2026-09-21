CREATE FUNCTION "test"."TestTaskComments_BelongToATaskAndAUser" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    SELECT * INTO _Row FROM "dbo"."TaskComments" WHERE "TaskUUID" = "test"."Fixture"('Task.Build');
    PERFORM "test"."AssertEquals"(_Row."Comment", 'Started on this.', 'the comment text should come back');
    PERFORM "test"."AssertEquals"(_Row."UserUUID", "test"."Fixture"('User.Member'), 'the comment should name its author');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestTaskComments_RejectAnUnknownTask" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."TaskComments" ("TaskUUID", "UserUUID", "Comment", "CreatedBy") VALUES (''00000000-0000-4000-8000-000000000000'', %L, ''Orphan.'', ''test'')',
            "test"."Fixture"('User.Member')
        ),
        'TaskComments accepted a task that does not exist'
    );
END;
$$ LANGUAGE plpgsql;
