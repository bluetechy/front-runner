ALTER TABLE "dbo"."UserRoles" ADD CONSTRAINT "FK_UserRoles_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
ALTER TABLE "dbo"."UserRoles" ADD CONSTRAINT "FK_UserRoles_Roles" FOREIGN KEY ("RoleUUID") REFERENCES "dbo"."Roles" ("RoleUUID");
