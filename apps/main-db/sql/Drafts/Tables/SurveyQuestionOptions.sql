CREATE TABLE SurveyQuestionOptions (
    OptionId serial PRIMARY KEY,
    QuestionId INT REFERENCES SurveyQuestions(QuestionId),
    OptionText TEXT NOT NULL,
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);
