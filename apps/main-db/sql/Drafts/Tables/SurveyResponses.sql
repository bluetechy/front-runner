-- MISSING REFS: Users (no such table in this folder).

CREATE TABLE SurveyResponses (
    ResponseId serial PRIMARY KEY,
    SurveyId INT REFERENCES Surveys(SurveyId),
    ParticipantId INT REFERENCES Users(UserId), -- Reference to the participant
    ResponseData JSONB, -- Store responses as JSON for flexibility
    SubmittedAt TIMESTAMPTZ DEFAULT NOW()
);
