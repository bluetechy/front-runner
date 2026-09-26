ALTER TABLE "dbo"."WidgetVersions" ADD CONSTRAINT "FK_WidgetVersions_Widgets" FOREIGN KEY ("WidgetUUID") REFERENCES "dbo"."Widgets" ("WidgetUUID");
