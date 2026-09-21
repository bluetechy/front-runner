ALTER TABLE "dbo"."UserPoints" ADD CONSTRAINT "FK_UserPoints_UserPoints" FOREIGN KEY ("ReversesUserPointUUID") REFERENCES "dbo"."UserPoints" ("UserPointUUID");
