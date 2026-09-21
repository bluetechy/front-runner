--
-- Something a user should be told about. "TaskUUID" is nullable: the draft
-- assumed every notification was about a task, and most of what this schema
-- would notify on now is not one.
--
-- "ReadAt" is not in the draft. Without it there is no way to ask what a user
-- has not seen yet, which is the only question a notification table exists to
-- answer -- see SCHEMA-NOTES.md.
--
CREATE TABLE "dbo"."Notifications" (
    "NotificationUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "UserUUID" uuid NOT NULL,
    "OrganizationUUID" uuid NOT NULL,
    "TaskUUID" uuid, -- NULL when the notification is not about a task
    "NotificationType" varchar(50) NOT NULL,
    "Message" text NOT NULL,
    "ReadAt" TIMESTAMPTZ, -- NULL until the user has seen it
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);
