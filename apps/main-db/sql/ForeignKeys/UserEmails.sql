ALTER TABLE "dbo"."UserEmails" ADD CONSTRAINT "FK_UserEmails_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
