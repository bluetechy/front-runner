CREATE TABLE SurveyQuestions (
    QuestionId serial PRIMARY KEY,
    SurveyId INT REFERENCES Surveys(SurveyId),
    QuestionText TEXT NOT NULL,
    QuestionType VARCHAR(20) NOT NULL, -- E.g., 'Multiple Choice', 'Open Text'
    QuestionOrder INT NOT NULL,
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);
