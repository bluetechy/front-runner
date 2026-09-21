-- Both user columns are qualified: neither is a plain "UserUUID".
ALTER TABLE "dbo"."AssignmentHistory" ADD CONSTRAINT "FK_AssignmentHistory_Tasks" FOREIGN KEY ("TaskUUID") REFERENCES "dbo"."Tasks" ("TaskUUID");
ALTER TABLE "dbo"."AssignmentHistory" ADD CONSTRAINT "FK_AssignmentHistory_Users_PreviousUserUUID" FOREIGN KEY ("PreviousUserUUID") REFERENCES "dbo"."Users" ("UserUUID");
ALTER TABLE "dbo"."AssignmentHistory" ADD CONSTRAINT "FK_AssignmentHistory_Users_NewUserUUID" FOREIGN KEY ("NewUserUUID") REFERENCES "dbo"."Users" ("UserUUID");
