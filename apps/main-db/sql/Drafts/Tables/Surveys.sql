CREATE TABLE Surveys (
    SurveyId serial PRIMARY KEY,
    Title VARCHAR(255) NOT NULL,
    Description TEXT,
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);
