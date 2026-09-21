--
-- Who was invited and whether they finished. The draft named this table's key
-- "ParticipantId" and then used the same name in SurveyResponses for a
-- Users(UserId) -- one name for two different things. Here the participant row
-- and the user it points at are separate columns.
--
CREATE TABLE "dbo"."SurveyParticipants" (
    "SurveyParticipantUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "SurveyUUID" uuid NOT NULL,
    "UserUUID" uuid NOT NULL,
    "InvitedAt" TIMESTAMPTZ,
    "CompletedAt" TIMESTAMPTZ, -- NULL until they finish
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "SurveyParticipants_UUIDs_UniqueKey" UNIQUE ("SurveyUUID", "UserUUID")
);
