--
-- Something a user should be told about. "TaskUUID" is nullable: the draft
-- assumed every notification was about a task, and most of what this schema
-- would notify on now is not one.
--
-- "ReadAt" is not in the draft. Without it there is no way to ask what a user
-- has not seen yet, which is the only question a notification table exists to
-- answer -- see SCHEMA-NOTES.md.
--
-- "ActorUUID" is not in the draft either: it is who *caused* this, as against
-- "UserUUID", who is being told. It is nullable because plenty of what this
-- schema notifies on has nobody behind it -- a task falling overdue, a level
-- reached, an update shipping -- and a column that had to be filled would mean
-- inventing an actor for those. The bell draws the actor as the face on the
-- row, and falls back to the notification's own icon where there is none.
--
CREATE TABLE "dbo"."Notifications" (
    "NotificationUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "UserUUID" uuid NOT NULL,
    "OrganizationUUID" uuid NOT NULL,
    "TaskUUID" uuid, -- NULL when the notification is not about a task
    "ActorUUID" uuid, -- NULL when nobody in particular caused it
    "NotificationType" varchar(50) NOT NULL,
    "Message" text NOT NULL,
    "ReadAt" TIMESTAMPTZ, -- NULL until the user has seen it
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);
