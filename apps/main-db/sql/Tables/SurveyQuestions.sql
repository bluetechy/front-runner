CREATE TABLE "dbo"."SurveyQuestions" (
    "SurveyQuestionUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "SurveyUUID" uuid NOT NULL,
    "QuestionText" text NOT NULL,
    "QuestionType" varchar(20) NOT NULL, -- 'Choice', 'MultiChoice', 'Text'
    "SortOrder" integer NOT NULL DEFAULT 0,
    "IsRequired" boolean NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);
