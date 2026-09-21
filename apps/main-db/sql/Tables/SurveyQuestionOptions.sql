--
-- The choices offered for a question. A 'Text' question has none.
--
CREATE TABLE "dbo"."SurveyQuestionOptions" (
    "SurveyQuestionOptionUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "SurveyQuestionUUID" uuid NOT NULL,
    "OptionText" text NOT NULL,
    "SortOrder" integer NOT NULL DEFAULT 0,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    -- Redundant on its own -- the first column is already the primary key --
    -- but it gives dbo.SurveyAnswers something to point a composite foreign
    -- key at, so an answer cannot pair a question with another question's
    -- option. See SCHEMA-NOTES.md.
    CONSTRAINT "SurveyQuestionOptions_UUIDs_UniqueKey" UNIQUE ("SurveyQuestionOptionUUID", "SurveyQuestionUUID")
);
