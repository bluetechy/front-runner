--
-- The draft stored every answer as a jsonb blob on SurveyResponses, which made
-- SurveyQuestionOptions unreferenced and "how many chose this option"
-- unanswerable. One row per answer is the whole point of the change, so that
-- is what these test.
--

CREATE FUNCTION "test"."TestSurveyAnswers_CountChoicesPerOption" () RETURNS void AS $$
DECLARE
    _Tally text;
BEGIN
    INSERT INTO "dbo"."SurveyAnswers" ("SurveyParticipantUUID", "SurveyQuestionUUID", "SurveyQuestionOptionUUID", "CreatedBy")
    VALUES ("test"."Fixture"('Participant.Owner'), "test"."Fixture"('Question.Choice'), "test"."Fixture"('Option.No'), 'test');

    SELECT string_agg(format('%s=%s', "Options"."OptionText", "Counted"."Total"), ', ' ORDER BY "Options"."SortOrder") INTO _Tally
    FROM "dbo"."SurveyQuestionOptions" AS "Options"
        LEFT JOIN (
            SELECT "SurveyQuestionOptionUUID", count(*) AS "Total"
            FROM "dbo"."SurveyAnswers" GROUP BY "SurveyQuestionOptionUUID"
        ) AS "Counted" ON ("Counted"."SurveyQuestionOptionUUID" = "Options"."SurveyQuestionOptionUUID")
    WHERE "Options"."SurveyQuestionUUID" = "test"."Fixture"('Question.Choice');

    PERFORM "test"."AssertEquals"(_Tally, 'Yes=1, No=1', 'aggregating by option is the thing the jsonb blob could not do');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSurveyAnswers_RejectAnEmptyAnswer" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."SurveyAnswers" ("SurveyParticipantUUID", "SurveyQuestionUUID", "CreatedBy") VALUES (%L, %L, ''test'')',
            "test"."Fixture"('Participant.Owner'), "test"."Fixture"('Question.Text')
        ),
        'SurveyAnswers accepted a row with neither an option nor any text'
    );
END;
$$ LANGUAGE plpgsql;

-- A multi-choice question takes several options from one participant, so the
-- unique key has to allow that.
CREATE FUNCTION "test"."TestSurveyAnswers_AllowSeveralOptionsForOneQuestion" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    INSERT INTO "dbo"."SurveyAnswers" ("SurveyParticipantUUID", "SurveyQuestionUUID", "SurveyQuestionOptionUUID", "CreatedBy")
    VALUES ("test"."Fixture"('Participant.Member'), "test"."Fixture"('Question.Choice'), "test"."Fixture"('Option.No'), 'test');

    SELECT count(*) INTO _Count FROM "dbo"."SurveyAnswers"
    WHERE "SurveyParticipantUUID" = "test"."Fixture"('Participant.Member')
        AND "SurveyQuestionUUID" = "test"."Fixture"('Question.Choice');
    PERFORM "test"."AssertEquals"(_Count, 2::bigint, 'one participant should be able to pick two options');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSurveyAnswers_RejectTheSameOptionTwice" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."SurveyAnswers" ("SurveyParticipantUUID", "SurveyQuestionUUID", "SurveyQuestionOptionUUID", "CreatedBy") VALUES (%L, %L, %L, ''test'')',
            "test"."Fixture"('Participant.Member'), "test"."Fixture"('Question.Choice'), "test"."Fixture"('Option.Yes')
        ),
        'SurveyAnswers accepted the same option twice from one participant'
    );
END;
$$ LANGUAGE plpgsql;

-- The unique key is NULLS NOT DISTINCT, so two free-text answers to one
-- question collide. A plain UNIQUE would let them both in, because Postgres
-- normally treats NULLs as distinct.
CREATE FUNCTION "test"."TestSurveyAnswers_RejectASecondFreeTextAnswer" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."SurveyAnswers" ("SurveyParticipantUUID", "SurveyQuestionUUID", "AnswerText", "CreatedBy") VALUES (%L, %L, ''Actually, one more thing.'', ''test'')',
            "test"."Fixture"('Participant.Member'), "test"."Fixture"('Question.Text')
        ),
        'SurveyAnswers took a second free-text answer -- NULLS NOT DISTINCT is what stops this'
    );
END;
$$ LANGUAGE plpgsql;

-- Answers lead back to a named user. If surveys are ever meant to be
-- anonymous, this test is the one that should start failing.
CREATE FUNCTION "test"."TestSurveyAnswers_AreAttributableToAUser" () RETURNS void AS $$
DECLARE
    _LoginName varchar(64);
BEGIN
    SELECT "Users"."LoginName" INTO _LoginName
    FROM "dbo"."SurveyAnswers"
        JOIN "dbo"."SurveyParticipants" ON ("SurveyParticipants"."SurveyParticipantUUID" = "SurveyAnswers"."SurveyParticipantUUID")
        JOIN "dbo"."Users" ON ("Users"."UserUUID" = "SurveyParticipants"."UserUUID")
    WHERE "SurveyAnswers"."AnswerText" = 'Keep it up.';

    PERFORM "test"."AssertEquals"(_LoginName::text, 'member', 'answers are identified, not anonymous -- see SCHEMA-NOTES.md');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestSurveyParticipants_SeparateInvitationFromCompletion" () RETURNS void AS $$
DECLARE
    _Outstanding text;
BEGIN
    SELECT string_agg("Users"."LoginName", ', ' ORDER BY "Users"."LoginName") INTO _Outstanding
    FROM "dbo"."SurveyParticipants"
        JOIN "dbo"."Users" ON ("Users"."UserUUID" = "SurveyParticipants"."UserUUID")
    WHERE "SurveyParticipants"."SurveyUUID" = "test"."Fixture"('Survey.Pulse')
        AND "SurveyParticipants"."CompletedAt" IS NULL;

    PERFORM "test"."AssertEquals"(_Outstanding, 'owner', 'the owner was invited and has not finished');
END;
$$ LANGUAGE plpgsql;

-- An option belongs to one question. Referencing SurveyQuestionOptions by its
-- key alone would let an answer name this question and that question's option;
-- the foreign key carries the question too, so the pair has to agree.
CREATE FUNCTION "test"."TestSurveyAnswers_RejectAnOptionFromAnotherQuestion" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."SurveyAnswers" ("SurveyParticipantUUID", "SurveyQuestionUUID", "SurveyQuestionOptionUUID", "CreatedBy") VALUES (%L, %L, %L, ''test'')',
            "test"."Fixture"('Participant.Owner'), "test"."Fixture"('Question.Text'), "test"."Fixture"('Option.Yes')
        ),
        'SurveyAnswers paired a question with an option belonging to a different question'
    );
END;
$$ LANGUAGE plpgsql;

-- The same composite key must not get in the way of free text, where the
-- option is NULL and there is nothing to match.
CREATE FUNCTION "test"."TestSurveyAnswers_StillAcceptFreeTextWithNoOption" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    INSERT INTO "dbo"."SurveyAnswers" ("SurveyParticipantUUID", "SurveyQuestionUUID", "AnswerText", "CreatedBy")
    VALUES ("test"."Fixture"('Participant.Owner'), "test"."Fixture"('Question.Text'), 'Nothing to add.', 'test');

    SELECT count(*) INTO _Count FROM "dbo"."SurveyAnswers"
    WHERE "SurveyParticipantUUID" = "test"."Fixture"('Participant.Owner') AND "AnswerText" = 'Nothing to add.';
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'MATCH SIMPLE should skip the composite check when the option is NULL');
END;
$$ LANGUAGE plpgsql;
