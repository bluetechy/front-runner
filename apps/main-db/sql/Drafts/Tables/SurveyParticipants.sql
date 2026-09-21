-- MISSING REFS: Users (no such table in this folder).

CREATE TABLE SurveyParticipants (
    ParticipantId serial PRIMARY KEY,
    SurveyId INT REFERENCES Surveys(SurveyId),
    UserId INT REFERENCES Users(UserId), -- Reference to the user participating
    InvitedAt TIMESTAMPTZ,
    CompletedAt TIMESTAMPTZ
);
