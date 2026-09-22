ALTER TABLE "dbo"."BankAccounts" ADD CONSTRAINT "FK_BankAccounts_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
