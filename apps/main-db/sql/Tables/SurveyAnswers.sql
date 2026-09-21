--
-- One row per answer, replacing the draft's SurveyResponses."ResponseData"
-- jsonb blob. The blob contradicted SurveyQuestionOptions: with every answer
-- opaque, nothing ever referenced an option row and "how many chose this one"
-- was unanswerable, which is most of what a survey is for.
--
-- ANSWERS ARE IDENTIFIED, NOT ANONYMOUS. "SurveyParticipantUUID" leads back to
-- a user. Anonymity is a schema decision, not a later filter -- making these
-- anonymous means keying answers to the survey and recording only completion
-- on dbo.SurveyParticipants. See SCHEMA-NOTES.md.
--
CREATE TABLE "dbo"."SurveyAnswers" (
    "SurveyAnswerUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "SurveyParticipantUUID" uuid NOT NULL,
    "SurveyQuestionUUID" uuid NOT NULL,
    "SurveyQuestionOptionUUID" uuid, -- NULL for a free-text answer
    "AnswerText" text, -- NULL when the answer is a chosen option
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "SurveyAnswers_HasAnAnswer_Check" CHECK (
        num_nonnulls("SurveyQuestionOptionUUID", "AnswerText") >= 1
    ),
    -- NULLS NOT DISTINCT so that the NULL option on a free-text answer still
    -- collides: one text answer per question, many chosen options per question.
    CONSTRAINT "SurveyAnswers_UUIDs_UniqueKey" UNIQUE NULLS NOT DISTINCT ("SurveyParticipantUUID", "SurveyQuestionUUID", "SurveyQuestionOptionUUID")
);
