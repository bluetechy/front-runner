ALTER TABLE "dbo"."CreditCards" ADD CONSTRAINT "FK_CreditCards_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
