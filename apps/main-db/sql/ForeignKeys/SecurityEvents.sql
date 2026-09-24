ALTER TABLE "dbo"."SecurityEvents" ADD CONSTRAINT "FK_SecurityEvents_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
