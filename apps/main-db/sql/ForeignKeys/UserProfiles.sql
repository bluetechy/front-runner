ALTER TABLE "dbo"."UserProfiles" ADD CONSTRAINT "FK_UserProfiles_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
