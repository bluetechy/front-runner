-- Whose widget it is. Authorization for every write goes through this column:
-- dbo.SaveWidget refuses a widget that is not the caller's.
ALTER TABLE "dbo"."Widgets" ADD CONSTRAINT "FK_Widgets_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
